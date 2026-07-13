import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import confusion_matrix
from sklearn.ensemble import RandomForestClassifier
import joblib
import kagglehub
from kagglehub import KaggleDatasetAdapter
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import sys

app = Flask(__name__)
CORS(app)

logging.getLogger('werkzeug').setLevel(logging.ERROR)
logging.getLogger('tensorflow').setLevel(logging.ERROR)

df = None
df_original = None
model = None
scaler = None
feature_columns = None
history = None
training_complete = False
y_train = None
y_pred = None

def prepare_features(X):
  X_copy = X.copy()
  X_copy['log_tds'] = np.log1p(X_copy['tds'])
  X_copy['ph_acidity'] = abs(X_copy['ph'] - 7)
  X_copy['tds_conductivity'] = X_copy['tds'] / (X_copy['conductivity'] + 1e-8)
  X_copy['tds_hardness'] = X_copy['tds'] / (X_copy['hardness'] + 1e-8)
  X_copy['organic_tds'] = X_copy['organic_carbon'] / (X_copy['tds'] + 1e-8)
  X_copy['log_conductivity'] = np.log1p(X_copy['conductivity'])
  return X_copy

@app.route('/api/load-data', methods=['GET'])
def load_data():
  global df, df_original, feature_columns
  
  try:
    df = kagglehub.dataset_load(KaggleDatasetAdapter.PANDAS, "developerghost/water-potability", "Watera.csv")
    df_original = df.copy()
    original_rows = len(df)
    
    columns_to_drop = [col for col in ["Unnamed: 0", "blank1", "blank2", "index"] if col in df.columns]
    df.drop(columns=columns_to_drop, inplace=True)
    df.replace([np.inf, -np.inf], np.nan, inplace=True)
    df.dropna(subset=["potability"], inplace=True)
    df.drop_duplicates(inplace=True)
    
    numeric_cols = df.select_dtypes(include=[np.number]).columns.drop("potability")
    df[numeric_cols] = df[numeric_cols].mask(df[numeric_cols] < 0, np.nan)
    df["ph"] = df["ph"].mask((df["ph"] < 0) | (df["ph"] > 14), np.nan)
    
    missing_before = df_original.isnull().sum().sum()
    problematic_rows = original_rows - len(df)
    
    for col in numeric_cols:
      df[col] = df[col].fillna(df[col].median())
    
    final_rows = len(df)
    removed_rows = original_rows - final_rows
    potability_counts = df["potability"].value_counts().sort_index().to_dict()
    
    ph_data = []
    ph_bins = np.linspace(df["ph"].min(), df["ph"].max(), 25)
    hist, _ = np.histogram(df["ph"], bins=ph_bins)
    for i in range(len(hist)):
      ph_data.append({
        "ph": round((ph_bins[i] + ph_bins[i+1]) / 2, 2),
        "count": int(hist[i])
      })
    
    potability_data = [
      {"name": "Непитейна", "value": int(potability_counts.get(0, 0))},
      {"name": "Питейна", "value": int(potability_counts.get(1, 0))}
    ]
    
    tds_data = []
    tds_values = df["tds"].values
    tds_min, tds_max = tds_values.min(), tds_values.max()
    tds_bins = np.linspace(tds_min, tds_max, 15)
    
    for i in range(len(tds_bins) - 1):
      bin_center = round((tds_bins[i] + tds_bins[i+1]) / 2, 2)
      non_potable_count = len(df[(df["potability"] == 0) & (df["tds"] >= tds_bins[i]) & (df["tds"] < tds_bins[i+1])])
      potable_count = len(df[(df["potability"] == 1) & (df["tds"] >= tds_bins[i]) & (df["tds"] < tds_bins[i+1])])
      tds_data.append({
        "tds": bin_center,
        "Непитейна": non_potable_count,
        "Питейна": potable_count
      })
    
    df_info = []
    for col in df.columns:
      df_info.append({
        "column": col,
        "dtype": str(df[col].dtype),
        "non_null": int(df[col].notna().sum()),
        "null_count": int(df[col].isna().sum())
      })
    
    correlation_data = []
    corr = df.corr(numeric_only=True)["potability"].drop("potability").sort_values(ascending=False)
    for col, val in corr.items():
      correlation_data.append({
        "feature": col,
        "correlation": round(float(val), 4)
      })
    
    return jsonify({
      'success': True,
      'stats': {
        'original_rows': original_rows,
        'final_rows': final_rows,
        'removed_rows': removed_rows,
        'columns': list(df.columns),
        'shape': [int(final_rows), len(df.columns)],
        'potability_distribution': {
          "Непитейна": int(potability_counts.get(0, 0)),
          "Питейна": int(potability_counts.get(1, 0))
        },
        'missing_values': int(missing_before),
        'problematic_rows': int(problematic_rows),
      },
      'chartData': {
        'ph_distribution': ph_data,
        'potability_distribution': potability_data,
        'tds_distribution': tds_data,
      },
      'info': df_info,
      'correlation': correlation_data
    }), 200
    
  except Exception as e:
    return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/train-model', methods=['GET'])
def train_model():
  global df, model, scaler, feature_columns, history, training_complete, y_train, y_pred
  
  try:
    if df is None:
      return jsonify({'success': False, 'error': 'Data not loaded'}), 400
    
    X = df.drop('potability', axis=1).copy()
    y = df['potability'].copy()
    
    X = prepare_features(X)
    feature_columns = X.columns.tolist()
    
    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    
    model = RandomForestClassifier(
      n_estimators=110,
      max_depth=12,
      min_samples_split=8,
      min_samples_leaf=4,
      n_jobs=-1,
      random_state=42
    )
    
    model.fit(X_train_scaled, y_train)
    
    train_acc = model.score(X_train_scaled, y_train)
    val_acc = model.score(X_val_scaled, y_val)
    
    y_pred = model.predict(X_train_scaled)
    
    history = {'accuracy': [], 'val_accuracy': [], 'loss': [], 'val_loss': []}
    
    for i in range(len(model.estimators_)):
      tree_pred_train = np.mean([est.predict(X_train_scaled) for est in model.estimators_[:i+1]], axis=0)
      tree_pred_val = np.mean([est.predict(X_val_scaled) for est in model.estimators_[:i+1]], axis=0)
      
      acc_train = np.mean(tree_pred_train.round() == y_train)
      acc_val = np.mean(tree_pred_val.round() == y_val)
      
      pred_train = tree_pred_train
      pred_val = tree_pred_val
      
      eps = 1e-15
      pred_train_clipped = np.clip(pred_train, eps, 1 - eps)
      pred_val_clipped = np.clip(pred_val, eps, 1 - eps)
      
      loss_train = -np.mean(y_train * np.log(pred_train_clipped) + (1 - y_train) * np.log(1 - pred_train_clipped))
      loss_val = -np.mean(y_val * np.log(pred_val_clipped) + (1 - y_val) * np.log(1 - pred_val_clipped))
      
      history['accuracy'].append(acc_train)
      history['val_accuracy'].append(acc_val)
      history['loss'].append(loss_train)
      history['val_loss'].append(loss_val)
    
    accuracy_data = []
    for idx in range(len(history['accuracy'])):
      accuracy_data.append({
        "epoch": idx + 1,
        "Обучение": round(float(history['accuracy'][idx]) * 100, 2),
        "Валидиране": round(float(history['val_accuracy'][idx]) * 100, 2)
      })
    
    loss_data = []
    for idx in range(len(history['loss'])):
      loss_data.append({
        "epoch": idx + 1,
        "Обучение": round(float(history['loss'][idx]), 4),
        "Валидиране": round(float(history['val_loss'][idx]), 4)
      })
    
    training_complete = True
    
    return jsonify({
      'success': True,
      'metrics': {
        'final_accuracy': float(train_acc),
        'final_loss': float(history['loss'][-1]),
        'epochs_trained': len(history['accuracy']),
        'best_val_accuracy': float(max(history['val_accuracy'])),
        'best_val_loss': float(min(history['val_loss']))
      },
      'chartData': {
        'accuracy': accuracy_data,
        'loss': loss_data,
      }
    }), 200
    
  except Exception as e:
    return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/predict', methods=['POST'])
def predict():
  global model, scaler, feature_columns, training_complete
  
  try:
    if not training_complete or model is None:
      return jsonify({'success': False, 'error': 'Model not trained'}), 400
    
    data = request.get_json()
    if not data:
      return jsonify({'success': False, 'error': 'No data'}), 400
    
    required_fields = ['ph', 'hardness', 'tds', 'chlorine', 'sulfate', 'conductivity', 'organic_carbon', 'trihalomethanes', 'turbidity']
    
    for field in required_fields:
      if field not in data:
        return jsonify({'success': False, 'error': f'Missing: {field}'}), 400
      try:
        float(data[field])
      except (ValueError, TypeError):
        return jsonify({'success': False, 'error': f'Invalid: {field}'}), 400
    
    input_df = pd.DataFrame([[
      float(data['ph']), float(data['hardness']), float(data['tds']),
      float(data['chlorine']), float(data['sulfate']),
      float(data['conductivity']), float(data['organic_carbon']),
      float(data['trihalomethanes']), float(data['turbidity'])
    ]], columns=['ph', 'hardness', 'tds', 'chlorine', 'sulfate', 'conductivity', 'organic_carbon', 'trihalomethanes', 'turbidity'])
    
    input_df = prepare_features(input_df)
    input_df = input_df[feature_columns]
    
    input_scaled = scaler.transform(input_df)
    probabilities = model.predict_proba(input_scaled)[0]
    prob_potable = probabilities[1]
    prob_non_potable = probabilities[0]
    
    threshold = 0.5
    prediction = 1 if prob_potable >= threshold else 0
    
    if prediction == 1:
      result = {
        'potable': True,
        'potability_label': 'Питейна вода',
        'confidence': prob_potable,
        'confidence_percent': f'{prob_potable * 100:.2f}%'
      }
    else:
      result = {
        'potable': False,
        'potability_label': 'Непитейна вода',
        'confidence': prob_non_potable,
        'confidence_percent': f'{prob_non_potable * 100:.2f}%'
      }
    
    return jsonify({'success': True, 'input': data, 'result': result}), 200
    
  except Exception as e:
    return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/get-statistics', methods=['GET'])
def get_statistics():
  global df
  
  try:
    if df is None:
      return jsonify({'success': False, 'error': 'Data not loaded'}), 400
    
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    if 'potability' in numeric_cols:
      numeric_cols.remove('potability')
    
    stats_data = []
    for col in numeric_cols:
      col_data = df[col]
      stats_data.append({
        'column': col,
        'mean': round(float(col_data.mean()), 4),
        'median': round(float(col_data.median()), 4),
        'std': round(float(col_data.std()), 4),
        'min': round(float(col_data.min()), 4),
        'max': round(float(col_data.max()), 4),
        'q25': round(float(col_data.quantile(0.25)), 4),
        'q75': round(float(col_data.quantile(0.75)), 4)
      })
    
    return jsonify({'success': True, 'statistics': stats_data}), 200
  except Exception as e:
    return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/status', methods=['GET'])
def status():
  global training_complete, df, model
  return jsonify({
    'success': True,
    'server_running': True,
    'data_loaded': df is not None,
    'model_trained': training_complete,
    'model_ready': model is not None and training_complete
  }), 200

@app.route('/api/health', methods=['GET'])
def health():
  return jsonify({'status': 'ok'}), 200

if __name__ == '__main__':
  app.run(debug=False, host='localhost', port=5000)
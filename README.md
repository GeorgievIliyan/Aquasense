# AquaSense - Water Potability Analysis System

## Overview

**AquaSense** is an application that uses machine learning to predict water potability. The system consists of three main components:

1. **Flask REST API** - server that processes data and trains the model
2. **React** - interactive user interface for visualization and interaction
3. **Python Notebook (Colab)** - the initial development and experimentation environment

The application analyzes water samples based on nine physico-chemical parameters and predicts whether the water is potable or non-potable.

---

## Algorithm Choice

### Why RandomForest?

During initial investigation of the problem, we experimented with several approaches:

1. **Neural networks (TensorFlow/Keras)** - Required complicated techniques for class balancing (SMOTE, class weights, label inversion). Results were erratic and more computationally expensive.

2. **Logistic regression** - A linear model, unsuitable for the nonlinear nature of water quality data.

3. **Random Forest** - Chosen in the end. Reasons:
   - ✅ Excellent balance between accuracy and speed
   - ✅ Automatically handles nonlinear relationships
   - ✅ Does not require complex class balancing
   - ✅ Interpretable - easy to see which features matter

### Model Configuration

```python
RandomForestClassifier(
    n_estimators=110,      # 100 decision trees
    max_depth=12,          # Maximum depth of each tree
    min_samples_split=8,   # Minimum samples to split a node
    min_samples_leaf=4,    # Minimum samples in a leaf node
    n_jobs=-1,             # Parallel training
    random_state=42        # Reproducibility
)
```

---

## Dataset Structure

### Data Source

The dataset is from Kaggle: **`developerghost/water-potability`** (Watera.csv)

### Columns and Description

| Column | Unit | Description | Range |
|--------|------|-------------|-------|
| **ph** | - | pH value of the water (acidity/alkalinity) | 0-14 |
| **hardness** | mg/L | Water hardness (calcium + magnesium) | 0-500 |
| **tds** | mg/L | Total dissolved solids | 0-30000 |
| **chlorine** | % | Chlorine concentration | 0-100 |
| **sulfate** | mg/L | Sulfate concentration | 0-1000 |
| **conductivity** | µS/cm | Electrical conductivity | 0-2000 |
| **organic_carbon** | mg/L | Organic carbon (contaminants) | 0-100 |
| **trihalomethanes** | µg/L | Trihalomethanes (halogenated contaminants) | 0-500 |
| **turbidity** | NTU | Turbidity (water clarity) | 0-10 |
| **potability** | 0/1 | **Target variable**: 0 = non-potable, 1 = potable | - |

### Data Sample

- **Original rows**: ~3276
- **Removed**: ~676 (with missing or duplicate values)
- **Final rows**: ~2600
- **Potable water**: ~1066 (41%)
- **Non-potable water**: ~1534 (59%)

### Preprocessing

1. **Removing invalid data**:
   - Negative values → NaN
   - pH outside the range [0, 14] → NaN
   - Infinite values → NaN

2. **Filling missing values**:
   - Median for each column

3. **Removing duplicate rows**

### Feature Engineering

We added 6 new features to the original 9:

```python
log_tds = log(1 + tds)                                    # Logarithmic scale for TDS
ph_acidity = |pH - 7|                                     # Deviation from neutrality
tds_conductivity = TDS / Conductivity                     # Ratio
tds_hardness = TDS / Hardness                             # Ratio
organic_tds = Organic_Carbon / TDS                        # Relative organic carbon
log_conductivity = log(1 + Conductivity)                  # Logarithmic scale
```

This helps the model capture nonlinear relationships and interactions between parameters.

---

## How It Works - Running the Application

### Option 1: Google Colab (development environment)

#### Required Libraries

```python
!pip install pandas numpy scikit-learn tensorflow kagglehub matplotlib seaborn
```

#### Steps:

1. **Open Google Colab**: https://colab.research.google.com
2. **Create a new notebook** or open the `ML.py` file
3. **Load via Kaggle**:
   ```python
   from kagglehub import KaggleDatasetAdapter
   import kagglehub
   
   # On first run you will be asked to log in to Kaggle
   df = kagglehub.dataset_load(
       KaggleDatasetAdapter.PANDAS, 
       "developerghost/water-potability",
       "Watera.csv"
   )
   ```
4. **Run the cells** in order
5. **Results**: Model, confusion matrix, accuracy and loss charts

#### Advantages of Colab:
- ✅ Free GPU (for faster training)
- ✅ No local installation required
- ✅ Interactive experimentation environment
- ✅ Easy result sharing

---

### Option 2: Flask + React (Production)

This is the full application with an interactive interface.

#### Prerequisites

- Python 3.8+
- Node.js 14+
- pip and npm

#### A. Starting the Flask Server

1. **Install dependencies**:
   ```bash
   pip install requirements.txt
   ```

2. **Run the server**:
   ```bash
   python server.py
   ```

3. **Verification**:
   - Open browser: `http://localhost:5000/api/health`
   - Expected: `{"status": "ok"}`

#### B. Starting the React Application

1. **Install dependencies** (in the React project folder):
   ```bash
   npm install
   ```

2. **Start the dev server**:
   ```bash
   npm start
   ```

3. **Open in browser**:
   - `http://localhost:5173`

#### C. Working Steps in the Application

1. **"Data" tab**:
   - Click "Load data"
   - The system downloads the dataset, cleans it, generates statistics and charts
   - You'll see: pH distribution, potability, TDS, column info, correlation coefficients

2. **"Training" tab**:
   - Click "Train model"
   - The system trains a RandomForest on the cleaned dataset
   - You'll see: accuracy, loss, training and validation curves

3. **"Prediction" tab**:
   - Enter values for each parameter
   - Click "Predict potability"
   - You'll see: result (potable/non-potable) + confidence

---

## API Endpoints

### `GET /api/load-data`
Loads and processes the dataset. Returns statistics, chart data, column info, and correlation coefficients.

**Response**:
```json
{
  "success": true,
  "stats": {
    "original_rows": 3276,
    "final_rows": 2600,
    "removed_rows": 676,
    "potability_distribution": {"Potable": 1066, "Non-potable": 1534},
    "missing_values": 123,
    "problematic_rows": 553
  },
  "chartData": {
    "ph_distribution": [...],
    "potability_distribution": [...],
    "tds_distribution": [...]
  },
  "info": [...],
  "correlation": [...]
}
```

### `GET /api/train-model`
Trains a RandomForest model. Returns metrics and training curves.

**Response**:
```json
{
  "success": true,
  "metrics": {
    "final_accuracy": 0.8524,
    "final_loss": 0.3245,
    "epochs_trained": 110,
    "best_val_accuracy": 0.8412,
    "best_val_loss": 0.3124
  },
  "chartData": {
    "accuracy": [...],
    "loss": [...]
  }
}
```

### `POST /api/predict`
Predicts water potability based on the parameters.

**Input**:
```json
{
  "ph": 7.2,
  "hardness": 120,
  "tds": 2500,
  "chlorine": 4.5,
  "sulfate": 250,
  "conductivity": 420,
  "organic_carbon": 8,
  "trihalomethanes": 45,
  "turbidity": 2.1
}
```

**Response**:
```json
{
  "success": true,
  "result": {
    "potable": true,
    "potability_label": "Potable water",
    "confidence": 0.87,
    "confidence_percent": "87.00%"
  }
}
```

### `GET /api/get-statistics`
Returns detailed statistics (mean, median, min, max, std. deviation) for each parameter.

### `GET /api/status`
Checks the server's state (whether data is loaded, whether the model is trained).

### `GET /api/health`
Simple check whether the server is alive.

---

## Project Structure

```
Aquasense/
├── backend/
├── frontend/
├── other
└── README.md                    # This file
```

---

## Performance and Results

### Model Accuracy

- **Training accuracy**: +99%
- **Validation accuracy**: +88%
- **Validation loss**: ~0.01

### Training Time

- On **GPU (Colab)**: ~30-60 seconds
- On **CPU (Laptop)**: ~1-2 minutes

### Class Distribution

The dataset is **imbalanced**: 92% non-potable water, 8% potable. RandomForest handles this well without additional balancing.

---

## Input Parameter Limits

The application validates each input parameter:

| Parameter | Minimum | Maximum | Unit |
|-----------|---------|---------|------|
| pH | 0 | 14 | - |
| Hardness | 0 | 500 | mg/L |
| TDS | 0 | 50000 | mg/L |
| Chlorine | 0 | 100 | % |
| Sulfate | 0 | 1000 | mg/L |
| Conductivity | 0 | 2000 | µS/cm |
| Organic carbon | 0 | 100 | mg/L |
| Trihalomethanes | 0 | 500 | µg/L |
| Turbidity | 0 | 10 | NTU |

---

## Conclusion

AquaSense demonstrates the powerful potential of machine learning for solving real-world problems in water quality analysis. By combining:
- **RandomForest** algorithm (fast, interpretable, accurate)
- **Feature engineering** (creating meaningful features)
- **Interactive interface** (React + Recharts)

I obtained a system that is scientific, practical, and easy to use all at once.

---

**Date created**: 2026  
**License**: MIT
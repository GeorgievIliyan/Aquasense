import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Input,
  SimpleGrid,
  Spinner,
} from '@chakra-ui/react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import {
  Zap,
  Database,
  Brain,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Download,
  Target,
  BarChart3,
  Network,
  Layers,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import TopNavbar from './TopNavbar';

const WaterPotability = () => {
  const API_URL = 'http://localhost:5000/api';
  const storageKey = 'water-potability-state';

  const getStoredState = () => {
    if (typeof window === 'undefined') return null;

    try {
      const saved = window.localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  const [state, setState] = useState(() => {
    const stored = getStoredState();
    return stored?.state || {
      dataLoaded: false,
      modelTrained: false,
      activeTab: 0,
    };
  });

  const [loading, setLoading] = useState({
    data: false,
    training: false,
    prediction: false,
  });

  const [data, setData] = useState(() => {
    const stored = getStoredState();
    return stored?.data || {
      stats: null,
      chartData: null,
      table: null,
      statistics: null,
      metrics: null,
      trainingCharts: null,
      info: null,
      correlation: null,
    };
  });

  const [alert, setAlert] = useState(null);

  const [prediction, setPrediction] = useState(() => {
    const stored = getStoredState();
    return stored?.prediction || {
      inputs: {
        ph: 7.0,
        hardness: 100.0,
        solids: 5000.0,
        chloramines: 5.0,
        sulfate: 300.0,
        conductivity: 400.0,
        organic_carbon: 10.0,
        trihalomethanes: 50.0,
        turbidity: 3.0,
      },
      errors: {},
      result: null,
    };
  });

  const inputRanges = {
    ph: { min: 0, max: 14, label: 'pH стойност' },
    hardness: { min: 0, max: 500, label: 'Твърдост на водата' },
    solids: { min: 0, max: 50000, label: 'Общо твърди вещества' },
    chloramines: { min: 0, max: 100, label: 'Хлорамини' },
    sulfate: { min: 0, max: 1000, label: 'Сулфати' },
    conductivity: { min: 0, max: 2000, label: 'Проводимост' },
    organic_carbon: { min: 0, max: 100, label: 'Органичен въглерод' },
    trihalomethanes: { min: 0, max: 500, label: 'Трихалометани' },
    turbidity: { min: 0, max: 10, label: 'Мътност' },
  };

  useEffect(() => {
    checkStatus();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ state, data, prediction })
    );
  }, [state, data, prediction]);

  const showAlert = (message, status = 'info') => {
    setAlert({ message, status });
    window.setTimeout(() => setAlert(null), 4000);
  };

  const checkStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/status`);
      const d = await res.json();
      setState((s) => ({
        ...s,
        dataLoaded: d.data_loaded,
        modelTrained: d.model_trained,
      }));
    } catch {
      showAlert('Неуспешна връзка със сървъра', 'error');
    }
  };

  const handleLoadData = async () => {
    setLoading((l) => ({ ...l, data: true }));
    setPrediction((p) => ({ ...p, result: null }));

    try {
      const res = await fetch(`${API_URL}/load-data`);
      const d = await res.json();

      if (d.success) {
        setData((x) => ({
          ...x,
          stats: d.stats,
          chartData: d.chartData,
          table: d.data_table,
          info: d.info,
          correlation: d.correlation,
        }));
        setState((s) => ({ ...s, dataLoaded: true }));
        await fetchStatistics();
        showAlert('Данните бяха заредени успешно', 'success');
      } else {
        showAlert(d.error || 'Зареждането не бе успешно', 'error');
      }
    } catch {
      showAlert('Грешка при свързване', 'error');
    } finally {
      setLoading((l) => ({ ...l, data: false }));
    }
  };

  const handleUpdateData = async () => {
    await handleLoadData();
  };

  const handleDeleteData = async () => {
    setData({
      stats: null,
      chartData: null,
      table: null,
      statistics: null,
      metrics: null,
      trainingCharts: null,
      info: null,
      correlation: null,
    });
    setState((s) => ({ ...s, dataLoaded: false, modelTrained: false }));
    setPrediction((p) => ({ ...p, result: null }));
    showAlert('Данните бяха изтрити', 'info');
  };

  const fetchStatistics = async () => {
    try {
      const res = await fetch(`${API_URL}/get-statistics`);
      const d = await res.json();
      if (d.success) {
        setData((x) => ({ ...x, statistics: d.statistics }));
      }
    } catch {
      console.error('Stats fetch failed');
    }
  };

  const handleTrainModel = async () => {
    if (!state.dataLoaded) {
      showAlert('Първо зареди данни', 'warning');
      return;
    }

    setLoading((l) => ({ ...l, training: true }));
    setPrediction((p) => ({ ...p, result: null }));

    try {
      const res = await fetch(`${API_URL}/train-model`);
      const d = await res.json();

      if (d.success) {
        setData((x) => ({
          ...x,
          metrics: d.metrics,
          trainingCharts: d.chartData,
        }));
        setState((s) => ({ ...s, modelTrained: true }));
        showAlert(
          `Моделът е обучен. Точност: ${(d.metrics.final_accuracy * 100).toFixed(2)}%`,
          'success'
        );
      } else {
        showAlert(d.error || 'Обучението не бе успешно', 'error');
      }
    } catch {
      showAlert('Грешка при свързване', 'error');
    } finally {
      setLoading((l) => ({ ...l, training: false }));
    }
  };

  const validateInput = (value, min, max) => {
    const num = parseFloat(value);
    if (isNaN(num)) return 'Трябва да е число';
    if (num < min) return `Минимум: ${min}`;
    if (num > max) return `Максимум: ${max}`;
    return null;
  };

  const handleInputChange = (field, value) => {
    setPrediction((p) => ({
      ...p,
      inputs: { ...p.inputs, [field]: parseFloat(value) || 0 },
      errors: { ...p.errors, [field]: null },
    }));
  };

  const handlePredict = async () => {
    if (!state.modelTrained) {
      showAlert('Първо обучи модела', 'warning');
      return;
    }

    const errors = {};
    Object.entries(prediction.inputs).forEach(([key, value]) => {
      const range = inputRanges[key];
      const err = validateInput(value, range.min, range.max);
      if (err) errors[key] = err;
    });

    if (Object.keys(errors).length > 0) {
      setPrediction((p) => ({ ...p, errors }));
      showAlert('Провери въведените стойности', 'error');
      return;
    }

    setLoading((l) => ({ ...l, prediction: true }));

    try {
      const res = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prediction.inputs),
      });

      const d = await res.json();

      if (d.success) {
        setPrediction((p) => ({ ...p, result: d.result }));
        showAlert('Анализът е завършен', 'success');
      } else {
        showAlert(d.error || 'Прогнозата не бе успешна', 'error');
      }
    } catch {
      showAlert('Грешка при свързване', 'error');
    } finally {
      setLoading((l) => ({ ...l, prediction: false }));
    }
  };

  const COLORS = ['#ef4444', '#10b981'];
  const tabs = [
    { label: 'Данни', icon: Database },
    { label: 'Обучение', icon: Brain },
    { label: 'Прогноза', icon: Target },
  ];

  const cardStyle = {
    bg: 'white',
    borderRadius: '2xl',
    boxShadow: 'lg',
    border: '1px solid #e5e7eb',
    p: 6,
  };

  return (
    <Box bg="linear-gradient(135deg, #f8fafc 0%, #f0f4f8 100%)" minH="100vh" pb={4}>
      <TopNavbar
        tabs={tabs}
        activeTab={state.activeTab}
        onTabChange={(index) => setState((s) => ({ ...s, activeTab: index }))}
      />

      <Container maxW="6xl" pt={4}>
        {alert && (
          <Box mb={6} p={4} borderRadius="xl" bg={alert.status === 'error' ? '#fee2e2' : alert.status === 'success' ? '#dcfce7' : '#eff6ff'} color="#111827">
            <Text fontWeight="600">{alert.message}</Text>
          </Box>
        )}

        {state.activeTab === 0 && (
          <VStack spacing={8} align="stretch">
            <Box {...cardStyle}>
              <VStack align="start" spacing={4} gap={4}>
                <HStack>
                  <Download size={36} color="#4c8baa" />
                  <VStack align="start" spacing={0} gap={0}>
                    <Heading size="md">Зареди набор от данни</Heading>
                    <Text fontSize="sm" color="gray.500">
                      от Kaggle
                    </Text>
                  </VStack>
                </HStack>
                <HStack w="full" spacing={4}>
                  {!data.stats ? (
                    <Button onClick={handleLoadData} bg="#4c8baa" color="white" _hover={{ bg: '#3d6b88' }} borderRadius="lg" flex={1}>
                      {loading.data ? <HStack spacing={2}><Spinner size="sm" /><Text>Зареждане...</Text></HStack> : 'Зареди данни'}
                    </Button>
                  ) : (
                    <>
                      <Button onClick={handleUpdateData} bg="#f59e0b" color="white" _hover={{ bg: '#d97706' }} borderRadius="lg" flex={1} leftIcon={<RefreshCw size={18} />}>
                        Обнови
                      </Button>
                      <Button onClick={handleDeleteData} bg="#ef4444" color="white" _hover={{ bg: '#dc2626' }} borderRadius="lg" flex={1} leftIcon={<Trash2 size={18} />}>
                        Изтрий
                      </Button>
                    </>
                  )}
                </HStack>
              </VStack>
            </Box>

            {data.stats && (
              <>
                <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} spacing={4}>
                  {[
                    {
                      label: 'Общо проби',
                      value: data.stats.final_rows.toLocaleString(),
                      hint: `Премахнати: ${data.stats.removed_rows}`,
                      color: '#2563eb',
                      icon: BarChart3,
                    },
                    {
                      label: 'Питейна вода',
                      value: data.stats.potability_distribution.Питейна,
                      hint: `${((data.stats.potability_distribution.Питейна / data.stats.final_rows) * 100).toFixed(1)}%`,
                      color: '#16a34a',
                      icon: CheckCircle2,
                    },
                    {
                      label: 'Липсващи стойности',
                      value: data.table
                        ? Object.values(data.table)
                          .flat()
                          .filter((value) => value === null || value === undefined || value === '')
                          .length
                        : 0,
                      hint: 'Преди обработка',
                      color: '#dc2626',
                      icon: AlertCircle,
                    },
                    {
                      label: 'Колони',
                      value: data.stats.shape[1] - 1,
                      hint: 'Показатели за вода',
                      color: '#f59e0b',
                      icon: Layers,
                    },
                  ].map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                      <Box key={index} bg={`${stat.color}10`} borderLeft={`4px solid ${stat.color}`} borderRadius="xl" p={4}>
                        <HStack justify="space-between" mb={3}>
                          <Text fontSize="sm" fontWeight="600" color="gray.600">{stat.label}</Text>
                          <Icon size={18} color={stat.color} />
                        </HStack>
                        <Heading size="lg" color="gray.900" mb={1}>{stat.value}</Heading>
                        <Text fontSize="xs" color="gray.600">{stat.hint}</Text>
                      </Box>
                    );
                  })}
                </SimpleGrid>

                {data.chartData && (
                  <>
                    <Box {...cardStyle}>
                      <Heading size="md" mb={6}>Разпределение по pH</Heading>
                      <Box h={300} w="full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={data.chartData.ph_distribution}>
                            <defs>
                              <linearGradient id="gradPh" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4c8baa" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#4c8baa" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis
                              dataKey="ph"
                              type="number"
                              domain={[5, 10]}
                              ticks={[5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10]}
                              stroke="#64748b"
                            />
                            <YAxis
                              stroke="#64748b"
                              domain={[0, 12000]}
                            />
                            <Tooltip />
                            <Area type="natural" dataKey="count" stroke="#4c8baa" fill="url(#gradPh)" strokeWidth={2} />

                            <Tooltip
                              labelFormatter={(value) => `pH: ${value}`}
                              formatter={(value) => [
                                value.toLocaleString("bg-BG"),
                                "Брой"
                              ]}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </Box>
                    </Box>

                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={10} w="full" gapX={2}>
                      <Box {...cardStyle} minW={0}>
                        <Heading size="md" mb={6}>Разпределение по питейност</Heading>
                        <Box h={300} minW={0}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={data.chartData.potability_distribution}
                                dataKey="value"
                                nameKey="name"
                                outerRadius={90}
                                label
                              >
                                {data.chartData.potability_distribution.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                  />
                                ))}
                              </Pie>

                              <Tooltip />
                              <Legend
                                verticalAlign="bottom"
                                formatter={(value) => <span style={{ marginRight: 24 }}>{value}</span>}
                                iconType='circle'
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </Box>
                      </Box>

                      <Box {...cardStyle} minW={0}>
                        <Heading size="md" mb={6}>Разпределение по TDS</Heading>

                        <Box h={350} minW={0} overflowX="auto">
                          <Box minW="900px" h="100%">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={data.chartData.tds_distribution.reduce((acc, item) => {
                                  const existing = acc.find((x) => x.tds === item.tds);
                                  const key = item.potability === "Питейна вода" ? "Питейна" : "Непитейна";

                                  if (existing) {
                                    existing[key] = item.count;
                                  } else {
                                    acc.push({
                                      tds: item.tds,
                                      [key]: item.count,
                                    });
                                  }

                                  return acc;
                                }, [])}
                                margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                                barCategoryGap={8}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />

                                <XAxis
                                  dataKey="tds"
                                  stroke="#64748b"
                                  tick={{ fontSize: 12 }}
                                  interval={2}
                                />

                                <YAxis stroke="#64748b" />

                                <Tooltip />
                                <Legend />

                                <Bar
                                  dataKey="Непитейна"
                                  name="Непитейна вода"
                                  fill="#ef4444"
                                  radius={[4, 4, 0, 0]}
                                  barSize={18}
                                />

                                <Bar
                                  dataKey="Питейна"
                                  name="Питейна вода"
                                  fill="#10b981"
                                  radius={[4, 4, 0, 0]}
                                  barSize={18}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </Box>
                        </Box>
                      </Box>
                    </SimpleGrid>
                  </>
                )}

                {data.statistics && (
                  <>
                    <Box {...cardStyle}>
                      <Heading size="md" mb={6}>Статистика на параметрите</Heading>
                      <Box overflowX="auto">
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: '#f3f4f5' }}>
                              <th style={{ padding: '10px', textAlign: 'left' }}>Параметър</th>
                              <th style={{ padding: '10px', textAlign: 'right' }}>Средно</th>
                              <th style={{ padding: '10px', textAlign: 'right' }}>Медиана</th>
                              <th style={{ padding: '10px', textAlign: 'right' }}>Мин.</th>
                              <th style={{ padding: '10px', textAlign: 'right' }}>Макс.</th>
                              <th style={{ padding: '10px', textAlign: 'right' }}>Стд. откл.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.statistics.map((stat, index) => (
                              <tr
                                key={index}
                                style={{
                                  borderTop: '1px solid #e5e7eb',
                                  backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb',
                                }}
                              >
                                <td style={{ padding: '10px', fontWeight: 500 }}>{stat.column}</td>
                                <td style={{ padding: '10px', textAlign: 'right' }}>{stat.mean.toFixed(2)}</td>
                                <td style={{ padding: '10px', textAlign: 'right' }}>{stat.median.toFixed(2)}</td>
                                <td style={{ padding: '10px', textAlign: 'right' }}>{stat.min.toFixed(2)}</td>
                                <td style={{ padding: '10px', textAlign: 'right' }}>{stat.max.toFixed(2)}</td>
                                <td style={{ padding: '10px', textAlign: 'right' }}>{stat.std.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </Box>
                    </Box>

                    {data.info && (
                      <Box {...cardStyle}>
                        <Heading size="md" mb={6}>Информация за данните (df.info())</Heading>
                        <Box overflowX="auto">
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ background: '#f3f4f5' }}>
                                <th style={{ padding: '10px', textAlign: 'left' }}>Колона</th>
                                <th style={{ padding: '10px', textAlign: 'left' }}>Тип</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>Непразни</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>Празни</th>
                              </tr>
                            </thead>
                            <tbody>
                              {data.info.map((col, index) => (
                                <tr
                                  key={index}
                                  style={{
                                    borderTop: '1px solid #e5e7eb',
                                    backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb',
                                  }}
                                >
                                  <td style={{ padding: '10px', fontWeight: 500 }}>{col.column}</td>
                                  <td style={{ padding: '10px' }}>{col.dtype}</td>
                                  <td style={{ padding: '10px', textAlign: 'right' }}>{col.non_null}</td>
                                  <td style={{ padding: '10px', textAlign: 'right' }}>{col.null_count}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </Box>
                      </Box>
                    )}

                    {data.correlation && (
                      <Box {...cardStyle}>
                        <Heading size="md" mb={6}>Корелация с potability</Heading>
                        <Box overflowX="auto">
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ background: '#f3f4f5' }}>
                                <th style={{ padding: '10px', textAlign: 'left' }}>Параметър</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>Корелация</th>
                              </tr>
                            </thead>
                            <tbody>
                              {data.correlation.map((item, index) => (
                                <tr
                                  key={index}
                                  style={{
                                    borderTop: '1px solid #e5e7eb',
                                    backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb',
                                  }}
                                >
                                  <td style={{ padding: '10px', fontWeight: 500 }}>{item.feature}</td>
                                  <td style={{ padding: '10px', textAlign: 'right' }}>{item.correlation}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </Box>
                      </Box>
                    )}
                  </>
                )}
              </>
            )}
          </VStack>
        )}

        {state.activeTab === 1 && (
          <VStack spacing={8} align="stretch">
            <Box {...cardStyle}>
              <VStack align="start" spacing={4} gap={4}>
                <HStack>
                  <Zap size={36} color="#4c8baa" />
                  <VStack align="start" spacing={0} gap={0}>
                    <Heading size="md">Обучи модел</Heading>
                    <Text fontSize="sm" color="gray.500">
                      чрез Random Forest
                    </Text>
                  </VStack>
                </HStack>
                <Button onClick={handleTrainModel} bg="#4c8baa" color="white" _hover={{ bg: '#3d6b88' }} borderRadius="lg" w="full" disabled={!state.dataLoaded}>
                  {loading.training ? <HStack spacing={2}><Spinner size="sm" /><Text>Обучение...</Text></HStack> : 'Обучи модел'}
                </Button>
              </VStack>
            </Box>

            {data.metrics && (
              <>
                <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} spacing={4}>
                  {[
                    { label: 'Точност', value: `${(data.metrics.final_accuracy * 100).toFixed(2)}%`, color: '#2563eb', icon: Target },
                    { label: 'Валидация', value: `${(data.metrics.best_val_accuracy * 100).toFixed(2)}%`, color: '#16a34a', icon: CheckCircle2 },
                    { label: 'Загуба', value: data.metrics.final_loss.toFixed(4), color: '#dc2626', icon: TrendingDown },
                    { label: 'Десетки дървета', value: data.metrics.epochs_trained, color: '#f59e0b', icon: Network },
                  ].map((metric, index) => {
                    const Icon = metric.icon;
                    return (
                      <Box key={index} bg={`${metric.color}10`} borderLeft={`4px solid ${metric.color}`} borderRadius="xl" p={4}>
                        <Text fontSize="sm" fontWeight="600" color="gray.600" mb={2}>{metric.label}</Text>
                        <HStack>
                          <Heading size="lg" color="gray.900">{metric.value}</Heading>
                          <Icon size={18} color={metric.color} />
                        </HStack>
                      </Box>
                    );
                  })}
                </SimpleGrid>

                {data.trainingCharts && (
                  <>
                    <Box {...cardStyle}>
                      <Heading size="md" mb={6}>Точност</Heading>
                      <Box h={350}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={data.trainingCharts.accuracy}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="epoch" stroke="#64748b" ticks={[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110]} />
                            <YAxis
                              stroke="#64748b"
                              ticks={[92, 93, 94, 95, 96, 97, 98, 99, 100]}
                              interval={0}
                            />
                            <Tooltip />
                            <Legend />
                            <Area type="monotone" dataKey="Обучение" stroke="#10b981" fill="#10b98120" strokeWidth={2} />
                            <Area type="monotone" dataKey="Валидиране" stroke="#4c8baa" fill="#4c8baa20" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </Box>
                    </Box>

                    <Box {...cardStyle}>
                      <Heading size="md" mb={6}>Загуби</Heading>
                      <Box h={350}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={data.trainingCharts.loss}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="epoch" stroke="#64748b" />
                            <YAxis stroke="#64748b" domain={['dataMin - 0.05', 'dataMax + 0.05']} ticks={[0.001, 0.01, 0.05, 0.1, 0.2, 0.5, 1.0, 1.5, 2.0]} />
                            <Tooltip />
                            <Legend />
                            <Area type="monotone" dataKey="Обучение" stroke="#ef4444" fill="#ef444420" strokeWidth={2} />
                            <Area type="monotone" dataKey="Валидиране" stroke="#f97316" fill="#f9731620" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </Box>
                    </Box>
                  </>
                )}
              </>
            )}
          </VStack>
        )}

        {state.activeTab === 2 && (
          <VStack spacing={8} align="stretch">
            <Box {...cardStyle}>
              <VStack align="start" spacing={6} gapY={4}>
                <HStack gap={2}>
                  <Target size={36} color="#4c8baa" />
                  <VStack align="start" gap={1}>
                    <Heading size="md" lineHeight="1.1" m={0}>
                      Прогноза за питейност на водата
                    </Heading>
                    <Text
                      fontSize="sm"
                      color="gray.500"
                      lineHeight="1.2"
                      m={0}
                    >
                      Въведи параметри на водата за прогноза
                    </Text>
                  </VStack>
                </HStack>

                <SimpleGrid columns={{ base: 2, md: 3 }} spacing={6} gapX={4} gapY={2} w="full">
                  {Object.entries(prediction.inputs).map(([key, value]) => {
                    const range = inputRanges[key];
                    const hasError = prediction.errors[key];
                    return (
                      <Box key={key}>
                        <Text fontSize="sm" fontWeight="600" mb={2}>{range.label}</Text>
                        <Input type="number" step="0.1" value={value} onChange={(e) => handleInputChange(key, e.target.value)} placeholder="0" disabled={loading.prediction} borderRadius="lg" />
                        {hasError && <Text fontSize="sm" color="red.500" mt={1}>{hasError}</Text>}
                      </Box>
                    );
                  })}
                </SimpleGrid>

                <Button onClick={handlePredict} bg="#4c8baa" color="white" _hover={{ bg: '#3d6b88' }} borderRadius="lg" w="full" disabled={!state.modelTrained}>
                  {loading.prediction ? <HStack spacing={2}><Spinner size="sm" /><Text>Анализиране...</Text></HStack> : 'Предвиди питейност'}
                </Button>
              </VStack>
            </Box>

            {prediction.result && (
              <Box {...cardStyle} borderLeft={`6px solid ${prediction.result.potable ? '#10b981' : '#ef4444'}`} bg={prediction.result.potable ? '#f0fdf4' : '#fef2f2'}>
                <VStack spacing={4} textAlign="center">
                  <Box fontSize="48px">{prediction.result.potable ? '✓' : '⚠'}</Box>
                  <Heading size="lg" color={prediction.result.potable ? 'green.700' : 'red.700'}>{prediction.result.potability_label}</Heading>
                  <Box w="full" h="10px" bg={prediction.result.potable ? '#dcfce7' : '#fee2e2'} borderRadius="full" overflow="hidden">
                    <Box h="100%" w={`${prediction.result.confidence * 100}%`} bg={prediction.result.potable ? '#16a34a' : '#dc2626'} />
                  </Box>
                  <Text fontSize="sm" color="gray.600">Увереност: {prediction.result.confidence_percent}</Text>
                  <Text fontSize="xs" color="gray.500">Суров резултат: {prediction.result.confidence.toFixed(4)}</Text>
                </VStack>
              </Box>
            )}
          </VStack>
        )}
      </Container>
    </Box>
  );
};

export default WaterPotability;
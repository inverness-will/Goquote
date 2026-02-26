import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getDebugTables, getDebugTableRows } from '../services/debugApi';

export interface DebugScreenProps {
  token: string;
  onBack: () => void;
}

export const DebugScreen: React.FC<DebugScreenProps> = ({ token, onBack }) => {
  const [tables, setTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);

  const loadTables = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDebugTables(token);
      setTables(data.tables || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tables');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  const openTable = async (tableName: string) => {
    setSelectedTable(tableName);
    setRowsLoading(true);
    setRows([]);
    try {
      const data = await getDebugTableRows(token, tableName);
      setRows(data.rows || []);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to load rows');
    } finally {
      setRowsLoading(false);
    }
  };

  const closeTable = () => {
    setSelectedTable(null);
    setRows([]);
  };

  if (selectedTable !== null) {
    return (
      <View style={styles.page}>
        <View style={styles.header}>
          <TouchableOpacity onPress={closeTable} style={styles.backBtn} hitSlop={8}>
            <Feather name="chevron-left" size={24} color="#1D2131" />
            <Text style={styles.backText}>Tables</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{selectedTable}</Text>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {rowsLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#F67A34" />
            </View>
          ) : (
            rows.map((row, index) => (
              <View key={index} style={styles.rowCard}>
                <Text style={styles.rowJson} selectable>
                  {JSON.stringify(row, null, 2)}
                </Text>
              </View>
            ))
          )}
          {!rowsLoading && rows.length === 0 && (
            <Text style={styles.emptyText}>No rows</Text>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={8}>
          <Feather name="chevron-left" size={24} color="#1D2131" />
          <Text style={styles.backText}>Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Database Debug</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#F67A34" />
          </View>
        ) : error ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadTables}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Tables</Text>
            {tables.map((name) => (
              <TouchableOpacity
                key={name}
                style={styles.tableRow}
                onPress={() => openTable(name)}
                activeOpacity={0.7}
              >
                <Text style={styles.tableName}>{name}</Text>
                <Feather name="chevron-right" size={20} color="#6B7280" />
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F3F4F6'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12
  },
  backText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontSize: 16,
    color: '#1D2131'
  },
  headerTitle: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 18,
    color: '#1D2131'
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32
  },
  loadingWrap: {
    paddingVertical: 48,
    alignItems: 'center'
  },
  sectionLabel: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#6B7280',
    marginBottom: 12
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  tableName: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '500',
    fontSize: 16,
    color: '#1D2131'
  },
  errorWrap: {
    padding: 24,
    alignItems: 'center'
  },
  errorText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontSize: 14,
    color: '#DC2626',
    marginBottom: 12
  },
  retryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F67A34',
    borderRadius: 8
  },
  retryText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontWeight: '600',
    fontSize: 14,
    color: '#FFFFFF'
  },
  rowCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  rowJson: {
    fontFamily: Platform.OS === 'web' ? 'monospace, ui-monospace' : undefined,
    fontSize: 12,
    color: '#374151'
  },
  emptyText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 24
  }
});

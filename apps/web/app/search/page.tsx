'use client';

import { useState, useEffect } from 'react';
import { api } from '@lib/api';
import { cardStyle, buttonStyle, fieldStyle, labelStyle } from '../../components/ui/styles';
import Link from 'next/link';

interface PublicListing {
  id: string;
  name: string;
  city: string;
  country: string;
  catPhotoUrl?: string;
  apartmentDescription: string;
  apartmentPhotoUrl?: string;
  dates: string;
  conditions: string;
  preferredDestinations: string;
  channelMessageId?: number;
  updatedAt: string;
}

export default function SearchPage() {
  const [listings, setListings] = useState<PublicListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async (filters?: { city?: string; country?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const { listings: data } = await api.fetchPublicListings({
        city: filters?.city || undefined,
        country: filters?.country || undefined,
        limit: 50
      });
      setListings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить объявления');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadListings({ 
      city: cityFilter || searchQuery,
      country: countryFilter 
    });
  };

  const handleReset = () => {
    setCityFilter('');
    setCountryFilter('');
    setSearchQuery('');
    loadListings();
  };

  const formatTimestamp = (value: string) => {
    try {
      return new Date(value).toLocaleString('ru-RU', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch {
      return value;
    }
  };

  return (
    <main style={{ maxWidth: 920, margin: '0 auto', padding: '48px 24px 120px', lineHeight: 1.6 }}>
      <header style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h1 style={{ fontSize: 32, margin: 0, color: '#1f2933' }}>🔍 Поиск жилья</h1>
          <Link 
            href="/twa"
            style={{
              fontSize: 14,
              color: '#2563eb',
              textDecoration: 'none',
              fontWeight: 600
            }}
          >
            ← Назад к анкете
          </Link>
        </div>
        <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
          Найдите идеальное место для обмена квартирами с котами
        </p>
      </header>

      {/* Search Form */}
      <section style={{ ...cardStyle, marginBottom: 24 }}>
        <form onSubmit={handleSearch} style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <label style={{ ...labelStyle, flex: 1, minWidth: 200 }}>
              Быстрый поиск
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={fieldStyle}
                placeholder="Город или страна..."
              />
            </label>
          </div>

          <details style={{ fontSize: 14 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: 12 }}>
              Дополнительные фильтры
            </summary>
            <div style={{ display: 'grid', gap: 12, paddingTop: 12 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <label style={{ ...labelStyle, flex: 1, minWidth: 150 }}>
                  Город
                  <input
                    type="text"
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    style={fieldStyle}
                    placeholder="Барселона"
                  />
                </label>
                <label style={{ ...labelStyle, flex: 1, minWidth: 150 }}>
                  Страна
                  <input
                    type="text"
                    value={countryFilter}
                    onChange={(e) => setCountryFilter(e.target.value)}
                    style={fieldStyle}
                    placeholder="Испания"
                  />
                </label>
              </div>
            </div>
          </details>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="submit"
              style={{ ...buttonStyle, flex: 1 }}
              disabled={loading}
            >
              {loading ? 'Поиск...' : '🔍 Найти'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              style={{
                ...buttonStyle,
                background: '#f3f4f6',
                color: '#374151',
                border: '1px solid #e5e7eb'
              }}
              disabled={loading}
            >
              Сбросить
            </button>
          </div>
        </form>
      </section>

      {/* Results */}
      <section>
        {error && (
          <div
            style={{
              ...cardStyle,
              background: '#fff5f5',
              border: '1px solid #fca5a5',
              color: '#7f1d1d',
              marginBottom: 24
            }}
          >
            <strong>Ошибка</strong>
            <p style={{ margin: '8px 0 0' }}>{error}</p>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
            Загружаем объявления...
          </div>
        )}

        {!loading && listings.length === 0 && (
          <div style={{ ...cardStyle, textAlign: 'center', padding: 40 }}>
            <p style={{ fontSize: 18, margin: 0, color: '#6b7280' }}>
              Ничего не найдено
            </p>
            <p style={{ fontSize: 14, margin: '8px 0 0', color: '#9ca3af' }}>
              Попробуйте изменить параметры поиска
            </p>
          </div>
        )}

        {!loading && listings.length > 0 && (
          <>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
              Найдено объявлений: <strong>{listings.length}</strong>
            </p>
            <div style={{ display: 'grid', gap: 20 }}>
              {listings.map((listing) => (
                <article key={listing.id} style={cardStyle}>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {listing.apartmentPhotoUrl && (
                      <img
                        src={listing.apartmentPhotoUrl}
                        alt={`${listing.city}`}
                        style={{
                          width: 200,
                          height: 150,
                          objectFit: 'cover',
                          borderRadius: 8,
                          border: '1px solid #e5e7eb'
                        }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 250 }}>
                      <h3 style={{ fontSize: 20, marginTop: 0, marginBottom: 8, color: '#1f2937' }}>
                        📍 {listing.city}, {listing.country}
                      </h3>
                      <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>
                        👤 {listing.name}
                      </p>
                      <p style={{ fontSize: 14, margin: '8px 0', color: '#374151' }}>
                        <strong>📅 Даты:</strong> {listing.dates}
                      </p>
                      <p style={{ fontSize: 14, margin: '8px 0', color: '#374151' }}>
                        <strong>🏠 Жильё:</strong> {listing.apartmentDescription}
                      </p>
                      <p style={{ fontSize: 14, margin: '8px 0', color: '#374151' }}>
                        <strong>✅ Условия:</strong> {listing.conditions}
                      </p>
                      <p style={{ fontSize: 14, margin: '8px 0', color: '#374151' }}>
                        <strong>🎯 Хочет в:</strong> {listing.preferredDestinations}
                      </p>
                      <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
                        {listing.channelMessageId && (
                          <a
                            href={`https://t.me/${process.env.NEXT_PUBLIC_CHANNEL_USERNAME || 'channel'}/${listing.channelMessageId}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              fontSize: 13,
                              color: '#2563eb',
                              textDecoration: 'none',
                              fontWeight: 600
                            }}
                          >
                            💬 Написать в канале →
                          </a>
                        )}
                        <span style={{ fontSize: 12, color: '#9ca3af' }}>
                          Обновлено {formatTimestamp(listing.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}


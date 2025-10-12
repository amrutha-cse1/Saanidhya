import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Newspaper, Play, Pause, Calendar } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { MurfService } from '../services/MurfService';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  date: string;
}

const NewsReader: React.FC = () => {
  const navigate = useNavigate();
  const { t, currentLanguage } = useLanguage();
  const [selectedDate, setSelectedDate] = useState('today');
  const [selectedCategory, setSelectedCategory] = useState('headlines');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentNews, setCurrentNews] = useState<NewsItem | null>(null);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

  const showToast = (message: string, ms = 3000) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: '', visible: false }), ms);
  };

  const [fetchedNews, setFetchedNews] = useState<any[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [sources, setSources] = useState<Array<{name:string;url:string}>>([]);
  const [activeSources, setActiveSources] = useState<Record<string, boolean>>({});
  const [isCached, setIsCached] = useState<boolean | null>(null);

  const dateOptions = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' }
  ];

  const categoryOptions = [
    { value: 'headlines', label: 'Headlines' },
    { value: 'health', label: 'Health' },
    { value: 'business', label: 'Business' },
    { value: 'sports', label: 'Sports' },
    { value: 'weather', label: 'Weather' }
  ];

  const getFilteredNews = () => {
    // For aggregated feed we ignore date filters for now and just provide category filtering
    let news = fetchedNews || [];
    // filter by active sources (by hostname match)
    const activeUrls = new Set(Object.entries(activeSources).filter(([k,v]) => v).map(([k]) => k));
    if (activeUrls.size > 0 && sources.length > 0) {
      news = news.filter(item => {
        if (!item.link) return true;
        try {
          const host = new URL(item.link).host;
          return Array.from(activeUrls).some(url => new URL(url).host === host);
        } catch (e) {
          return true;
        }
      });
    }

    if (selectedCategory !== 'headlines') {
      news = news.filter(item => (item.category || '').toLowerCase() === selectedCategory.toLowerCase());
    }
    return news;
  };

  useEffect(() => {
    let mounted = true;
    const fetchNews = async () => {
      setLoadingNews(true);
      try {
        const Api = (await import('../services/ApiService')).default;
        const [res, srcs] = await Promise.all([Api.getAggregatedNews(), Api.getNewsSources()]);
        if (!mounted) return;
        setSources(srcs.sources || []);
        // initialize activeSources if empty
        if (Object.keys(activeSources).length === 0) {
          const map: Record<string, boolean> = {};
          (srcs.sources || []).forEach((s: any) => { map[s.url] = true; });
          setActiveSources(map);
        }
        if (!mounted) return;
        // Normalize incoming news items and assign a category (simple keyword-based)
        const normalize = (items: any[]) => {
          const healthKeywords = ['health', 'covid', 'vaccine', 'hospital', 'doctor', 'nursing', 'flu'];
          const businessKeywords = ['market', 'stocks', 'econom', 'business', 'trade', 'inflation', 'bank'];
          const sportsKeywords = ['match', 'score', 'league', 'tournament', 'goal', 'win', 'cricket', 'football', 'olympic'];
          const weatherKeywords = ['weather', 'storm', 'rain', 'temperature', 'snow', 'forecast', 'heat'];

          const detectCategory = (title = '', snippet = '') => {
            const text = (title + ' ' + snippet).toLowerCase();
            if (healthKeywords.some(k => text.includes(k))) return 'Health';
            if (businessKeywords.some(k => text.includes(k))) return 'Business';
            if (sportsKeywords.some(k => text.includes(k))) return 'Sports';
            if (weatherKeywords.some(k => text.includes(k))) return 'Weather';
            return 'Headlines';
          };

          return (items || []).map((it: any, idx: number) => ({
            id: it.id || it.link || `${idx}`,
            title: it.title || it.headline || '',
            summary: it.contentSnippet || it.summary || it.content || '',
            category: it.category || detectCategory(it.title, it.contentSnippet || it.summary || ''),
            date: it.pubDate || it.date || '' ,
            link: it.link || ''
          }));
        };

        setFetchedNews(normalize(res.news || []));
        setLastUpdated(res.lastUpdated || null);
        setIsCached(!!res.cached);
      } catch (e) {
        console.warn('Failed to fetch aggregated news', e);
      } finally {
        if (mounted) setLoadingNews(false);
      }
    };

    fetchNews();

    const interval = setInterval(fetchNews, 5 * 60 * 1000); // refresh every 5 minutes
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const handlePlayNews = async (newsItem: NewsItem) => {
    // If this item is currently playing, stop playback
    if (isPlaying && currentNews?.id === newsItem.id) {
      try {
        await MurfService.stop();
        showToast('Playback stopped');
      } catch (e) { console.warn('Stop error', e); }
      setIsPlaying(false);
      setCurrentNews(null);
      return;
    }

    // If something else is playing (another item or Play All), stop it first
    if (isPlaying) {
      try { await MurfService.stop(); } catch (e) { console.warn('Stop error', e); }
    }

    setCurrentNews(newsItem);
    setIsPlaying(true);

    const newsText = `Here is today's news. ${newsItem.title}. ${newsItem.summary}`;
    try {
      await MurfService.playText(newsText, currentLanguage.code);
    } catch (e) {
      console.warn('Play item error', e);
      showToast('Playback error');
    } finally {
      setIsPlaying(false);
      setCurrentNews(null);
    }
  };

  const handlePlayAllNews = async () => {
    // If already playing, stop playback
    if (isPlaying) {
      try { await MurfService.stop(); } catch (e) { console.warn('Stop error', e); }
      setIsPlaying(false);
      showToast('Playback stopped');
      return;
    }

    const news = getFilteredNews();
    if (news.length === 0) return;

    setIsPlaying(true);

    let allNewsText = `Here are the ${selectedCategory} for ${selectedDate}. `;
    news.forEach((item, index) => {
      allNewsText += `Story ${index + 1}: ${item.title}. ${item.summary}. `;
    });

    try {
      await MurfService.playText(allNewsText, currentLanguage.code);
    } catch (e) {
      console.warn('Play all news error', e);
      showToast('Playback error');
    } finally {
      setIsPlaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="flex items-center p-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors mr-4"
          >
            <ArrowLeft className="text-gray-600" size={24} />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
              <Newspaper className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-800">{t('newsReader')}</h1>
              <p className="text-sm text-gray-600">Listen to latest news</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          {/* Filters */}
          <div className="bg-white rounded-xl p-4 shadow-md mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar size={16} className="inline mr-2" />
                  Select Date
                </label>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {dateOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categoryOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {/* Source filters */}
            <div className="mt-4 mb-4">
              <div className="text-sm font-medium text-gray-700 mb-2">Sources</div>
              <div className="flex flex-wrap gap-2">
                {sources.length === 0 ? (
                  <div className="text-xs text-gray-500">Loading sources…</div>
                ) : sources.map(src => (
                  <label key={src.url} className={`px-3 py-1 rounded-full border ${activeSources[src.url] ? 'bg-blue-600 text-white border-transparent' : 'bg-white text-gray-700 border-gray-200'}`}>
                    <input type="checkbox" checked={!!activeSources[src.url]} onChange={() => setActiveSources(prev => ({ ...prev, [src.url]: !prev[src.url] }))} className="hidden" />
                    <span className="text-xs">{src.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Play All Button */}
              <div className="flex gap-3 items-start mt-4">
                <button
                  onClick={handlePlayAllNews}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl flex items-center justify-center space-x-2"
                >
                  {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                  <span>{isPlaying ? 'Stop' : 'Play All News'}</span>
                </button>

                <div className="w-40 bg-white rounded-lg shadow p-2 flex flex-col justify-center ml-2">
                  <div className="text-xs text-gray-500">Last updated</div>
                  <div className="text-sm text-gray-800">
                    {lastUpdated ? new Date(lastUpdated).toLocaleString() : '—'}
                  </div>
                  <button onClick={async () => {
                    setLoadingNews(true);
                    try {
                      const res = await (await import('../services/ApiService')).default.getAggregatedNews();
                      setFetchedNews(res.news || []);
                      setLastUpdated(res.lastUpdated || null);
                    } catch (e) { console.warn(e); }
                    setLoadingNews(false);
                  }} className="mt-2 text-xs text-blue-600 underline">Refresh</button>
                </div>
              </div>
          </div>

          {/* News List */}
          <div className="space-y-4">
            {getFilteredNews().map(newsItem => (
              <div key={newsItem.id} className="bg-white rounded-xl p-4 shadow-md">
                <div className="flex items-start space-x-4">
                  <button
                    onClick={() => handlePlayNews(newsItem)}
                    className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                      isPlaying && currentNews?.id === newsItem.id
                        ? 'bg-red-100 hover:bg-red-200'
                        : 'bg-blue-100 hover:bg-blue-200'
                    }`}
                  >
                    {isPlaying && currentNews?.id === newsItem.id ? (
                      <Pause className="text-red-600" size={20} />
                    ) : (
                      <Play className="text-blue-600" size={20} />
                    )}
                  </button>

                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {newsItem.category}
                      </span>
                      <span className="text-xs text-gray-500">{newsItem.date}</span>
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-2">{newsItem.title}</h3>
                    <p className="text-sm text-gray-600">{newsItem.summary}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {getFilteredNews().length === 0 && (
            <div className="text-center py-12">
              <Newspaper className="mx-auto text-gray-400 mb-4" size={64} />
              <p className="text-gray-600">No news available</p>
              <p className="text-sm text-gray-500">Try selecting a different date or category</p>
            </div>
          )}
        </div>
      </div>
      {/* Toast / Snackbar */}
      {toast.visible && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default NewsReader;
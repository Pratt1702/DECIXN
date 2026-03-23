import { ExternalLink, Newspaper } from "lucide-react";

interface NewsItem {
  title: string;
  link: string;
  publisher: string;
  providerPublishTime: number;
}

export function NewsPanel({ news }: { news: NewsItem[] | null }) {
  const loading = !news;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-black text-text-bold mb-3 flex items-center gap-2">
        Recent News
      </h2>
      
      <div className="space-y-3">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="bg-bg-surface border border-border-main p-5 rounded-xl animate-pulse h-24" />
          ))
        ) : news.length > 0 ? (
          news.map((item, idx) => (
            <a
              key={idx}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block group bg-bg-surface border border-border-main hover:border-accent/40 hover:bg-white/[0.02] transition-all p-5 rounded-xl"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-accent bg-accent/10 px-2 py-0.5 rounded">
                      {item.publisher}
                    </span>
                    <span className="text-[10px] font-bold text-text-muted">
                      {formatDate(item.providerPublishTime)}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-text-bold group-hover:text-accent transition-colors line-clamp-2 leading-relaxed">
                    {item.title}
                  </h3>
                </div>
                <div className="p-2 rounded-lg bg-white/5 text-white/20 group-hover:text-accent group-hover:bg-accent/10 transition-all shrink-0">
                  <ExternalLink className="w-4 h-4" />
                </div>
              </div>
            </a>
          ))
        ) : (
          <div className="bg-bg-surface border border-border-main p-8 rounded-xl text-center">
            <Newspaper className="w-8 h-8 text-text-muted mx-auto mb-3 opacity-20" />
            <p className="text-text-muted italic text-sm font-medium">
              No recent news articles found for this ticker.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

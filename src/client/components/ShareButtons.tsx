import { useState } from "react";
import { Check, Facebook, Link2, Share2, Twitter } from "lucide-react";

/** Share buttons: native share sheet, Facebook, X, copy link. */
export function ShareButtons({ title, url }: { title: string; url?: string }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = url ?? window.location.href;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const nativeShare = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url: shareUrl });
      } catch {
        // User dismissed the share sheet; nothing to do.
      }
    } else {
      await copyLink();
    }
  };

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Share this article">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Share</span>
      <button
        type="button"
        onClick={nativeShare}
        aria-label="Share"
        className="rounded-full border border-slate-300 p-2 text-slate-600 hover:border-[#c1121f] hover:text-[#c1121f]"
      >
        <Share2 size={16} />
      </button>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Share on Facebook"
        className="rounded-full border border-slate-300 p-2 text-slate-600 hover:border-[#c1121f] hover:text-[#c1121f]"
      >
        <Facebook size={16} />
      </a>
      <a
        href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Share on X"
        className="rounded-full border border-slate-300 p-2 text-slate-600 hover:border-[#c1121f] hover:text-[#c1121f]"
      >
        <Twitter size={16} />
      </a>
      <button
        type="button"
        onClick={copyLink}
        aria-label="Copy link"
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-[#c1121f] hover:text-[#c1121f]"
      >
        {copied ? <Check size={14} /> : <Link2 size={14} />}
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}

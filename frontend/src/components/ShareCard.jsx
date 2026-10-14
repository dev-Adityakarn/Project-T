import { useRef, useState } from "react";
import { Download, Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE, SITE_URL } from "@/seo";
import { trackEvent } from "@/lib/analytics";

const draw = (canvas, { wpm, accuracy, duration, label }) => {
  const ctx = canvas.getContext("2d");
  const W = 1200;
  const H = 630;
  ctx.fillStyle = "#0b1120";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 44) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 44) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "rgba(34,197,94,0.22)");
  grad.addColorStop(1, "rgba(14,165,233,0.10)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#22c55e";
  ctx.font = "600 28px 'JetBrains Mono', monospace";
  ctx.fillText("TYPINGER", 80, 110);
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = "400 26px 'IBM Plex Sans', sans-serif";
  ctx.fillText(label, 80, 160);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 180px 'Chakra Petch', sans-serif";
  ctx.fillText(String(wpm), 80, 360);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "600 44px 'Chakra Petch', sans-serif";
  ctx.fillText("WPM", 80 + ctx.measureText(String(wpm)).width + 190, 360);

  const stats = [["Accuracy", `${accuracy}%`], ["Duration", `${duration}s`]];
  stats.forEach(([k, v], i) => {
    const x = 80 + i * 320;
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "500 24px 'IBM Plex Sans', sans-serif";
    ctx.fillText(k.toUpperCase(), x, 450);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 60px 'Chakra Petch', sans-serif";
    ctx.fillText(v, x, 515);
  });

  ctx.fillStyle = "#22c55e";
  ctx.font = "500 28px 'JetBrains Mono', monospace";
  ctx.fillText(SITE_URL.replace(/^https?:\/\//, "") || "typinger.in", 80, 580);
};

export const ShareCard = ({ wpm, accuracy, duration, label }) => {
  const ref = useRef(null);
  const [copied, setCopied] = useState(false);

  const render = () => {
    const canvas = ref.current || document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    draw(canvas, { wpm, accuracy, duration, label });
    return canvas;
  };

  const download = () => {
    const canvas = render();
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `typinger-${wpm}wpm.png`;
    a.click();
    trackEvent("share_card_download", { wpm, accuracy });
  };

  const share = async () => {
    const canvas = render();
    const text = `I just typed ${wpm} WPM at ${accuracy}% accuracy on ${SITE.name}.`;
    try {
      const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
      const file = new File([blob], `typinger-${wpm}wpm.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${wpm} WPM on ${SITE.name}`, text, url: SITE_URL });
        trackEvent("share_card_share", { wpm });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${SITE_URL}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      download();
    }
  };

  return (
    <div className="mt-6" data-testid="share-card">
      <canvas ref={ref} width={1200} height={630} className="hidden" aria-hidden="true" />
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" className="rounded-full px-5" onClick={download} data-testid="share-download-btn">
          <Download size={16} /> Download result card
        </Button>
        <Button variant="outline" className="rounded-full px-5" onClick={share} data-testid="share-result-btn">
          {copied ? <Check size={16} /> : <Share2 size={16} />} {copied ? "Copied!" : "Share result"}
        </Button>
      </div>
    </div>
  );
};

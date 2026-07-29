"use client";

import { useState, useEffect } from "react";
import { Copy, Check, ExternalLink, QrCode, Palette, Code2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BookingWidgetPanelProps {
  slug: string;
  salonName: string;
}

export function BookingWidgetPanel({ slug, salonName }: BookingWidgetPanelProps) {
  const [origin, setOrigin] = useState("");
  const [buttonColor, setButtonColor] = useState("#F48E16");
  const [buttonText, setButtonText] = useState("Book Now");
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const bookingUrl = origin ? `${origin}/book/${slug}` : `/book/${slug}`;
  const embedUrl = origin ? `${origin}/book/${slug}?embed=1` : `/book/${slug}?embed=1`;
  const scriptSrc = origin ? `${origin}/api/widget/${slug}` : `/api/widget/${slug}`;

  const scriptTag = `<script src="${scriptSrc}"></script>`;

  async function copyToClipboard(text: string, setCopied: (v: boolean) => void) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* ── Live preview ─────────────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-primary" />
            Live Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            This is how the booking form looks when embedded on an external site.
          </p>
          {/* iframe preview */}
          <div className="rounded-xl overflow-hidden border border-border shadow-sm bg-white">
            <iframe
              src={embedUrl}
              title={`Booking form for ${salonName}`}
              className="w-full"
              style={{ height: "480px", border: "none", display: "block" }}
              loading="lazy"
            />
          </div>
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-3 text-sm text-primary hover:underline underline-offset-4"
          >
            <ExternalLink className="w-4 h-4" />
            Open full booking page
          </a>
        </CardContent>
      </Card>

      {/* ── Embed code ───────────────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Code2 className="w-4 h-4 text-primary" />
            Embed Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Paste this single line before the closing{" "}
            <code className="font-mono text-xs bg-secondary px-1 py-0.5 rounded">&lt;/body&gt;</code>{" "}
            tag on any website. It adds a floating &ldquo;Book Now&rdquo; button that opens the
            booking form in a modal.
          </p>
          <div className="flex items-stretch gap-2">
            <div className="flex-1 font-mono text-sm bg-secondary rounded-xl px-4 py-3 border border-border text-foreground overflow-x-auto whitespace-nowrap select-all">
              {scriptTag}
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(scriptTag, setCopiedScript)}
              className="flex-shrink-0 flex items-center gap-2 px-4 rounded-xl border border-border bg-background hover:bg-muted text-sm font-medium transition-colors"
              aria-label="Copy embed code"
            >
              {copiedScript ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-500">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ── Direct booking link ───────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-primary" />
            Direct Booking Link
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Share this URL directly with clients via messaging apps, email, or social media.
          </p>
          <div className="flex items-stretch gap-2">
            <div className="flex-1 font-mono text-sm bg-secondary rounded-xl px-4 py-3 border border-border text-foreground overflow-x-auto whitespace-nowrap select-all">
              {bookingUrl}
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(bookingUrl, setCopiedLink)}
              className="flex-shrink-0 flex items-center gap-2 px-4 rounded-xl border border-border bg-background hover:bg-muted text-sm font-medium transition-colors"
              aria-label="Copy booking link"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-500">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open Page
            </a>
          </div>
        </CardContent>
      </Card>

      {/* ── QR Code ──────────────────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <QrCode className="w-4 h-4 text-primary" />
            QR Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Generate a QR code for your booking page to use on printed materials, storefronts, or
            business cards.
          </p>
          <div className="p-4 bg-secondary rounded-xl border border-border space-y-3">
            <p className="text-sm font-medium text-foreground">Your booking URL:</p>
            <p className="font-mono text-sm text-muted-foreground break-all">{bookingUrl}</p>
            <div className="border-t border-border pt-3 space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">To generate a QR code:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>
                  Copy the URL above, then visit{" "}
                  <a
                    href="https://qr.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-4"
                  >
                    qr.io
                  </a>
                  ,{" "}
                  <a
                    href="https://www.qrcode-monkey.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-4"
                  >
                    qrcode-monkey.com
                  </a>
                  , or any free QR generator.
                </li>
                <li>Paste the URL and download as PNG or SVG.</li>
                <li>Print it on business cards, receipts, or window signs.</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Customization ────────────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            Button Customization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Customize the floating button injected by the embed script. Copy the updated snippet
            after making changes.
          </p>
          <div className="space-y-4">
            {/* Button color */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-foreground w-28 shrink-0" htmlFor="btn-color">
                Button color
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="btn-color"
                  type="color"
                  value={buttonColor}
                  onChange={(e) => setButtonColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-background p-0.5"
                  aria-label="Choose button color"
                />
                <span className="font-mono text-sm text-muted-foreground">{buttonColor}</span>
              </div>
            </div>

            {/* Button text */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-foreground w-28 shrink-0" htmlFor="btn-text">
                Button text
              </label>
              <input
                id="btn-text"
                type="text"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                maxLength={40}
                className="flex-1 h-9 px-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Book Now"
              />
            </div>

            {/* Live button preview */}
            <div className="mt-2 flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Preview:</span>
              <button
                type="button"
                style={{
                  background: buttonColor,
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px 20px",
                  fontSize: "15px",
                  fontWeight: 600,
                  cursor: "default",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
              >
                {buttonText || "Book Now"}
              </button>
            </div>

            {/* Updated snippet */}
            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-2">
                Customization coming in a future release — the embed script currently uses these
                defaults. You can manually override the button&apos;s style after the script tag:
              </p>
              <pre className="font-mono text-xs bg-secondary rounded-xl px-4 py-3 border border-border text-foreground overflow-x-auto whitespace-pre-wrap select-all">
                {`<script src="${scriptSrc}"></script>
<script>
  document.addEventListener('DOMContentLoaded', function() {
    var btn = document.querySelector('[data-zaloon-btn]');
    if (btn) {
      btn.style.background = '${buttonColor}';
      btn.innerText = '${buttonText || "Book Now"}';
    }
  });
</script>`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

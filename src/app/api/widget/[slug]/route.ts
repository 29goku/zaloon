import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Verify the salon exists
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { id: true, name: true },
  });

  if (!salon) {
    return new Response("// Salon not found", {
      status: 404,
      headers: { "Content-Type": "text/javascript" },
    });
  }

  // Generate the embeddable script
  const script = `(function() {
  var BOOKING_URL = '/book/${slug}?embed=1';

  // Create floating button
  var btn = document.createElement('button');
  btn.innerText = 'Book Now';
  btn.style.cssText = 'position:fixed;bottom:24px;right:24px;padding:12px 24px;background:#F48E16;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.2);font-family:system-ui,sans-serif;font-weight:600;transition:background 0.2s';
  document.body.appendChild(btn);

  // Create overlay + modal
  var overlay = document.createElement('div');
  overlay.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;align-items:center;justify-content:center';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Book an appointment');

  var modal = document.createElement('div');
  modal.style.cssText = 'background:#fff;border-radius:16px;width:min(480px,96vw);height:min(720px,90vh);overflow:hidden;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.3)';

  var closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.setAttribute('aria-label', 'Close booking');
  closeBtn.style.cssText = 'position:absolute;top:12px;right:14px;width:32px;height:32px;border:none;background:rgba(0,0,0,0.08);border-radius:50%;font-size:20px;line-height:1;cursor:pointer;z-index:1;color:#444;display:flex;align-items:center;justify-content:center';

  var iframe = document.createElement('iframe');
  iframe.src = BOOKING_URL;
  iframe.style.cssText = 'width:100%;height:100%;border:none;display:block';
  iframe.setAttribute('title', 'Book an appointment');

  modal.appendChild(closeBtn);
  modal.appendChild(iframe);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  function openModal() {
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    overlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  btn.onclick = openModal;
  closeBtn.onclick = closeModal;
  overlay.onclick = function(e) { if (e.target === overlay) closeModal(); };
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeModal(); });
})();`;

  return new Response(script, {
    status: 200,
    headers: {
      "Content-Type": "text/javascript",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

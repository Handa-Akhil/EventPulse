export default function ETicket({ booking, qrDataUrl, onClose }) {
  if (!booking) return null;

  const reference = booking.id.slice(-6).toUpperCase();

  const downloadTicket = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const width = 420;
    const height = 720;
    canvas.width = width;
    canvas.height = height;

    // Background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#1a1118");
    gradient.addColorStop(0.5, "#120f14");
    gradient.addColorStop(1, "#0f0c11");
    ctx.fillStyle = gradient;
    ctx.roundRect(0, 0, width, height, 24);
    ctx.fill();

    // Accent stripe
    const stripeGrad = ctx.createLinearGradient(0, 0, width, 0);
    stripeGrad.addColorStop(0, "#ff7a59");
    stripeGrad.addColorStop(1, "#5ce1e6");
    ctx.fillStyle = stripeGrad;
    ctx.fillRect(0, 0, width, 6);

    // Header
    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 11px Space Grotesk, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("EVENTPULSE E-TICKET", 28, 40);

    // Title
    ctx.fillStyle = "#fff6ef";
    ctx.font = "bold 22px DM Serif Display, serif";
    const titleLines = wrapText(ctx, booking.title, width - 56);
    let y = 72;
    for (const line of titleLines) {
      ctx.fillText(line, 28, y);
      y += 28;
    }

    // Divider
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(20, y + 10);
    ctx.lineTo(width - 20, y + 10);
    ctx.stroke();
    ctx.setLineDash([]);

    // Details
    y += 35;
    const details = [
      ["VENUE", booking.venue],
      ["DATE", booking.dateLabel],
      ["TIME", booking.slot],
      ["TICKETS", `${booking.quantity}`],
      ["TOTAL", `Rs. ${booking.total}`],
      ["REFERENCE", reference],
    ];

    for (const [label, value] of details) {
      ctx.fillStyle = "#d7c1b1";
      ctx.font = "bold 9px Space Grotesk, sans-serif";
      ctx.fillText(label, 28, y);
      ctx.fillStyle = "#fff6ef";
      ctx.font = "16px Space Grotesk, sans-serif";
      ctx.fillText(value, 28, y + 18);
      y += 42;
    }

    // QR Code
    if (qrDataUrl) {
      const img = new Image();
      img.onload = () => {
        const qrSize = 140;
        const qrX = (width - qrSize) / 2;
        const qrY = height - qrSize - 50;

        ctx.fillStyle = "#fff6ef";
        ctx.roundRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 12);
        ctx.fill();

        ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

        ctx.fillStyle = "#d7c1b1";
        ctx.font = "10px Space Grotesk, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Scan to verify your ticket", width / 2, height - 22);
        ctx.textAlign = "left";

        // Download
        const link = document.createElement("a");
        link.download = `EventPulse-Ticket-${reference}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      };
      img.src = qrDataUrl;
    }
  };

  function wrapText(ctx, text, maxWidth) {
    const words = text.split(" ");
    const lines = [];
    let line = "";
    for (const word of words) {
      const test = line + word + " ";
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line.trim());
        line = word + " ";
      } else {
        line = test;
      }
    }
    lines.push(line.trim());
    return lines;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="eticket-modal fade-up" onClick={(e) => e.stopPropagation()}>
        {/* Ticket card */}
        <div className="eticket">
          <div className="eticket__accent-bar" />

          <div className="eticket__header">
            <span className="eticket__brand">EVENTPULSE</span>
            <span className="eticket__label">E-TICKET</span>
          </div>

          <h2 className="eticket__title">{booking.title}</h2>

          <div className="eticket__tear" />

          <div className="eticket__details">
            <div className="eticket__detail-row">
              <div className="eticket__detail">
                <span>VENUE</span>
                <strong>{booking.venue}</strong>
              </div>
              <div className="eticket__detail">
                <span>DATE</span>
                <strong>{booking.dateLabel}</strong>
              </div>
            </div>

            <div className="eticket__detail-row">
              <div className="eticket__detail">
                <span>TIME SLOT</span>
                <strong>{booking.slot}</strong>
              </div>
              <div className="eticket__detail">
                <span>TICKETS</span>
                <strong>{booking.quantity}</strong>
              </div>
            </div>

            <div className="eticket__detail-row">
              <div className="eticket__detail">
                <span>TOTAL PAID</span>
                <strong>Rs. {booking.total}</strong>
              </div>
              <div className="eticket__detail">
                <span>REFERENCE</span>
                <strong className="eticket__ref">{reference}</strong>
              </div>
            </div>
          </div>

          <div className="eticket__tear" />

          {/* QR Code */}
          <div className="eticket__qr-section">
            {qrDataUrl ? (
              <div className="eticket__qr-frame">
                <img src={qrDataUrl} alt="Ticket QR Code" className="eticket__qr" />
              </div>
            ) : (
              <p className="supporting-text">QR code unavailable</p>
            )}
            <p className="eticket__scan-text">Scan this QR to verify your ticket</p>
          </div>
        </div>

        {/* Actions */}
        <div className="eticket__actions">
          <button className="button button--primary" onClick={downloadTicket} type="button">
            📥 Download Ticket
          </button>
          <button className="button button--ghost" onClick={onClose} type="button">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

export function TicketActions() {
  const download = () => {
    window.print();
  };

  const share = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "My Event Ticket",
        text: "Here's my ticket!",
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Ticket link copied.");
    }
  };

  return (
    <div className="mt-8 flex gap-4">
      <button
        onClick={download}
        className="flex-1 rounded-xl bg-violet-600 py-3 font-semibold text-white"
      >
        Download Ticket
      </button>

      <button
        onClick={share}
        className="flex-1 rounded-xl border py-3 font-semibold"
      >
        Share
      </button>
    </div>
  );
}
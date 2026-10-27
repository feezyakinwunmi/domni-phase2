import TicketRenderer from "@/components/tickets/TicketRenderer";

export default function TestTicketPage() {

  return (
    <div className="min-h-screen bg-slate-100 p-10">

      <TicketRenderer

        templateKey={"velvet-noir"}

        data={{
          eventName:"DOMNI Launch",
          attendeeName:"Femi",
          ticketType:"VIP",
          date:"August 20",
          venue:"Lagos",
          qr:""
        }}

      />

    </div>
  );
}
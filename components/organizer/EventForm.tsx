"use client";

import { useEffect, useState } from "react";
import { Plus, ImagePlus } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import {
  SectionEditor,
  emptyTicketType,
  type SectionDraft,
} from "./SectionEditor";

import {
  RegistrationFormBuilder,
  type RegistrationFieldDraft,
} from "./RegistrationFormBuilder";

import { type TicketTemplate } from "../../components/events/TicketTemplatePicker";

import { createEvent } from "@/lib/actions/events";
import { updateEvent } from "@/lib/actions/update-event";
import { createEventSchema } from "@/lib/validations/event";

import { createClient } from "@/lib/supabase/client";
import { uploadEventCover } from "@/lib/supabase/storage";


interface EventFormProps {
  initialData?: any;
  plan?: string;
}


function sectionsFromInitialData(initialData: any): SectionDraft[] | null {
  if (!initialData?.sections?.length) return null;

  return initialData.sections.map((section: any) => ({
    id: section.id,
    title: section.title,
    description: section.description || "",
    ticketTypes: (section.ticketTypes || []).map((tt: any) => ({
      id: tt.id,
      title: tt.title,
      description: tt.description || "",
      price: String((tt.priceKobo ?? 0) / 100),
      quantity: String(tt.quantity ?? ""),
      maxPerBuyer: tt.maxPerBuyer != null ? String(tt.maxPerBuyer) : "",
      perksText: (tt.perks || []).join(", "),
      ticketTemplateId: tt.ticketTemplateId ?? null,
      templateCustomization: tt.templateCustomization ?? null,
    })),
  }));
}

function registrationFieldsFromInitialData(
  initialData: any
): RegistrationFieldDraft[] {
  if (!initialData?.registrationFields?.length) return [];

  return initialData.registrationFields.map((field: any) => ({
    id: field.id,
    label: field.label,
    type: field.type,
    placeholder: field.placeholder || "",
    required: field.required ?? false,
    options: Array.isArray(field.options) ? field.options.join(",") : "",
  }));
}

function emptySection(): SectionDraft {
  return {
    id: crypto.randomUUID(),
    title: "",
    description: "",
    ticketTypes: [emptyTicketType()],
  };
}


export function EventForm({
  initialData,
  plan = "FREE",
}: EventFormProps) {


  const [title,setTitle] =
    useState(initialData?.title || "");


  const [description,setDescription] =
    useState(initialData?.description || "");


  const [venue,setVenue] =
    useState(initialData?.venue || "");


  const [schoolName,setSchoolName] =
    useState(initialData?.schoolName || "");


  const [startsAt,setStartsAt] =
    useState(
      initialData?.startsAt
      ? new Date(initialData.startsAt)
        .toISOString()
        .slice(0,16)
      : ""
    );


  const [endsAt,setEndsAt] =
    useState(
      initialData?.endsAt
      ? new Date(initialData.endsAt)
        .toISOString()
        .slice(0,16)
      : ""
    );


  const [coverFile,setCoverFile] =
    useState<File | null>(null);



  const [sections,setSections] =
    useState<SectionDraft[]>(
      sectionsFromInitialData(initialData) || [emptySection()]
    );



  // Full Name and Email are always collected at checkout regardless of this
  // list (see TicketModal) — this builder is only for additional questions.
  const [registrationFields,setRegistrationFields]
  =
  useState<RegistrationFieldDraft[]>(
    registrationFieldsFromInitialData(initialData)
  );




  // ==============================
  // TICKET TEMPLATE STATE
  // ==============================

  const [templates,setTemplates] =
    useState<TicketTemplate[]>([]);



  useEffect(()=>{

    async function loadTemplates(){

      const res =
        await fetch(
          "/api/ticket-templates"
        );


      if(res.ok){

        const data =
          await res.json();

        setTemplates(data);

      }

    }


    loadTemplates();

  },[]);





  const [error,setError] =
    useState<string | null>(null);


  const [submitting,setSubmitting] =
    useState(false);





  function updateSection(
    id:string,
    patch:Partial<SectionDraft>
  ){

    setSections(prev=>
      prev.map(section=>
        section.id===id
        ?
        {
          ...section,
          ...patch
        }
        :
        section
      )
    );

  }






  async function handleSubmit(
    e:React.FormEvent
  ){

    e.preventDefault();

    setError(null);

    setSubmitting(true);



    try{


      const supabase =
        createClient();


      const {
        data:{
          user
        }
      }
      =
      await supabase.auth.getUser();



      if(!user){

        throw new Error(
          "You need to be logged in."
        );

      }




      let coverImageUrl =
        initialData?.coverImage || "";



      if(coverFile){

        coverImageUrl =
          await uploadEventCover(
            coverFile,
            user.id
          );

      }






      const payload = {

        title,

        description,

        venue,

        schoolName,

        coverImageUrl,


        startsAt,

        endsAt,


        registrationFields,


        sections:
        sections.map(section=>({

          id:
            section.id,

          title:
            section.title,


          description:
            section.description,


          ticketTypes:
          section.ticketTypes.map(ticket=>({

            id:
              ticket.id,

            title:
              ticket.title,


            description:
              ticket.description,


            price:
              ticket.price === ""
              ?
              0
              :
              Number(ticket.price),


            quantity:
              ticket.quantity === ""
              ?
              0
              :
              Number(ticket.quantity),


            maxPerBuyer:
              ticket.maxPerBuyer === ""
              ?
              undefined
              :
              Number(ticket.maxPerBuyer),


            perks:
              ticket.perksText
              .split(",")
              .map(x=>x.trim())
              .filter(Boolean),

            ticketTemplateId:
              ticket.ticketTemplateId,

            templateCustomization:
              ticket.templateCustomization,

          }))

        }))

      };





      const parsed =
        createEventSchema.safeParse(
          payload
        );



      if(!parsed.success){

        throw new Error(
          parsed.error
          .issues[0]
          ?.message ||
          "Invalid data"
        );

      }






      if(initialData){


        await updateEvent(
          initialData.id,
          payload
        );


      }
      else{


        const formData =
          new FormData();


        formData.set(
          "payload",
          JSON.stringify(payload)
        );


        await createEvent(
          null,
          formData
        );


      }



      setSubmitting(false);



    }
    catch(err){


      setError(
        err instanceof Error
        ?
        err.message
        :
        "Something went wrong"
      );


      setSubmitting(false);

    }


  }






  return (

<form
onSubmit={handleSubmit}
className="space-y-6"
>


<div className="rounded-2xl border bg-white p-5">


<p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
Event details
</p>



<div className="mt-4 grid gap-4 sm:grid-cols-2">


<div className="sm:col-span-2">

<Label>
Event name
</Label>


<Input
value={title}
onChange={
e=>setTitle(e.target.value)
}
/>

</div>



<div>

<Label>
Venue
</Label>


<Input
value={venue}
onChange={
e=>setVenue(e.target.value)
}
/>

</div>




<div>

<Label>
School
</Label>


<Input
value={schoolName}
onChange={
e=>setSchoolName(e.target.value)
}
/>

</div>





<div>

<Label>
Cover image
</Label>


<label
htmlFor="cover"
className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 text-sm"
>

<ImagePlus size={16}/>

{
coverFile
?
coverFile.name
:
"Upload image"
}

</label>


<input
id="cover"
hidden
type="file"
accept="image/*"
onChange={
e=>
setCoverFile(
e.target.files?.[0] || null
)
}
/>

</div>



<div>

<Label>
Starts at
</Label>

<Input
type="datetime-local"
value={startsAt}
onChange={
e=>setStartsAt(e.target.value)
}
/>

</div>



<div>

<Label>
Ends at
</Label>

<Input
type="datetime-local"
value={endsAt}
onChange={
e=>setEndsAt(e.target.value)
}
/>

</div>



<div className="sm:col-span-2">

<Label>
Description
</Label>


<Input
value={description}
onChange={
e=>setDescription(e.target.value)
}
/>

</div>



</div>

</div>






<div className="space-y-4">


<div className="flex justify-between">


<p className="text-xs font-semibold uppercase text-slate-400">
Sections
</p>


<Button
type="button"
variant="secondary"
size="sm"
onClick={()=>
setSections([
...sections,
emptySection()
])
}
>

<Plus size={14}/>

Add section

</Button>


</div>



{
sections.map((section,index)=>(

<SectionEditor

    key={section.id}

    section={section}

    index={index}

    eventTitle={title}

    templates={templates}

    plan={plan}

    registrationFields={registrationFields}

    onChange={
      patch => updateSection(
        section.id,
        patch
      )} onRemove={function (): void {
        throw new Error("Function not implemented.");
      } } removable={false}
/>

))

}


</div>





<RegistrationFormBuilder

fields={registrationFields}

onChange={setRegistrationFields}

/>






{
error &&
<FieldError>
{error}
</FieldError>
}





<div className="flex justify-end">


<Button
disabled={submitting}
>

{
submitting
?
"Saving..."
:
initialData
?
"Update Event"
:
"Create Event"
}

</Button>


</div>



</form>

  );

}
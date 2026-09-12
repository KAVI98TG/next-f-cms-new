import { useState } from "react";
import { BookOpen, LifeBuoy, Megaphone, MessageSquareReply, Settings2, ThumbsUp, Waypoints } from "lucide-react";
import { Card, SectionHeader } from "../../shared/components";
import { OverviewPanel } from "./components/OverviewPanel";
import { KnowledgePanel } from "./components/KnowledgePanel";
import { AnnouncementsPanel } from "./components/AnnouncementsPanel";
import { RequestsPanel } from "./components/RequestsPanel";
import { RepliesPanel } from "./components/RepliesPanel";
import { FeedbackPanel } from "./components/FeedbackPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { helpCenterStore } from "./data/helpCenterStore";
import { useHelpCenter } from "./shared/useHelpCenter";

type View = "overview" | "knowledge" | "announcements" | "requests" | "replies" | "feedback" | "settings";

export function HelpCenterPage() {
  const [view,setView]=useState<View>("overview");
  const requests=useHelpCenter(helpCenterStore.getRequests); const articles=useHelpCenter(helpCenterStore.getArticles); const feedback=useHelpCenter(helpCenterStore.getFeedback);
  const openRequests=requests.filter((r)=>!["resolved","closed"].includes(r.status)).length;
  const tabs:[View,string,number|undefined][]=[
    ["overview","Overview",undefined],["knowledge","Knowledge",articles.length],["announcements","Announcements",undefined],["requests","Requests",openRequests],["replies","Saved Replies",undefined],["feedback","Feedback",feedback.length],["settings","Settings",undefined]
  ];
  return <div className="page">
    <SectionHeader eyebrow="Platform" title="Customer Help Center" description="One shared NEXT F customer-help system for knowledge, announcements, requests, routing, agent replies and feedback while Digital, Gaming and Software keep their own operational support workflows." />
    <Card className="help-center-nav"><div className="segmented-nav" role="tablist" aria-label="Help Center sections">{tabs.map(([id,label,count])=><button key={id} className={view===id?"is-active":""} onClick={()=>setView(id)}>{id==="overview"&&<Waypoints size={14}/>} {id==="knowledge"&&<BookOpen size={14}/>} {id==="announcements"&&<Megaphone size={14}/>} {id==="requests"&&<LifeBuoy size={14}/>} {id==="replies"&&<MessageSquareReply size={14}/>} {id==="feedback"&&<ThumbsUp size={14}/>} {id==="settings"&&<Settings2 size={14}/>} {label}{count!==undefined&&<span>{count}</span>}</button>)}</div></Card>
    {view==="overview"&&<OverviewPanel/>}
    {view==="knowledge"&&<KnowledgePanel/>}
    {view==="announcements"&&<AnnouncementsPanel/>}
    {view==="requests"&&<RequestsPanel/>}
    {view==="replies"&&<RepliesPanel/>}
    {view==="feedback"&&<FeedbackPanel/>}
    {view==="settings"&&<SettingsPanel/>}
  </div>;
}

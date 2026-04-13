import { BookIcon, GiftIcon, HeartIcon } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const tabs = [
  {
    name: "Explore",
    value: "explore",
    icon: BookIcon,
    content:
      "Discover fresh ideas, trending topics, and hidden gems curated just for you. Start exploring and let your curiosity lead the way.",
  },
  {
    name: "Favorites",
    value: "favorites",
    icon: HeartIcon,
    content:
      "All your favorites are saved here. Revisit articles, collections, and moments you love, any time you want a little inspiration.",
  },
  {
    name: "Surprise",
    value: "surprise",
    icon: GiftIcon,
    content:
      "Surprise! Here's something unexpected: a fun fact, a quirky tip, or a daily challenge. Come back for a new surprise every day.",
  },
];

export default function Tabs03Demo() {
  return (
    <div className="w-full max-w-md">
      <Tabs defaultValue="explore" className="grid gap-4">
        <TabsList aria-label="Tabs 3 demo" className="w-full">
          {tabs.map(({ icon: Icon, name, value }) => (
            <TabsTrigger key={value} value={value} className="flex flex-1 items-center gap-2 px-3 py-2">
              <Icon className="size-4" aria-hidden="true" />
              <span>{name}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <p className="text-sm text-muted-foreground">{tab.content}</p>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

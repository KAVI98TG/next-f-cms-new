import type { LucideIcon } from "lucide-react";

export type DomainId = "platform" | "next-f" | "gaming-store" | "software";

export type NavItem = {
  label: string;
  path: string;
  icon: LucideIcon;
  description: string;
};

export type DomainDefinition = {
  id: DomainId;
  label: string;
  shortLabel: string;
  description: string;
  path: string;
  icon: LucideIcon;
  navigation: NavItem[];
};

export type RouteDefinition = {
  path: string;
  title: string;
  description: string;
  domain: DomainId;
};

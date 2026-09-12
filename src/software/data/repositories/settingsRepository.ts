import { audit,KEYS,read,seedSettings,write } from "../core";
import type { SoftwareSettings } from "../types";
export const softwareSettingsRepository={getSettings:()=>read(KEYS.settings,seedSettings),saveSettings(settings:SoftwareSettings){write(KEYS.settings,settings);audit("Software settings updated","NEXT F Software","License and delivery policy changed.");return settings;}};

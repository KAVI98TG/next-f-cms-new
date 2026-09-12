import { audit, KEYS, read, seedSettings, write } from "../core";
import type { GamingSettings } from "../types";
export const gamingSettingsRepository={getSettings:()=>read(KEYS.settings,seedSettings),saveSettings(settings:GamingSettings){write(KEYS.settings,settings);audit("Gaming settings updated","Gaming Store","Local pricing and operational safeguards changed.");return settings;}};

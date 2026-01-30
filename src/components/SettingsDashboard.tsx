import AppearanceSection from "./settings/AppearanceSection";
import GeneralSection from "./settings/GeneralSection";
import OrganizationSection from "./settings/OrganizationSection";
import AutomationSection from "./settings/AutomationSection";

export default function SettingsDashboard() {
  return (
    <div className="settings-dashboard">
      <h1 className="settings-title">Control Center</h1>

      <div className="settings-grid">
        <AppearanceSection />
        <GeneralSection />
        <OrganizationSection />
        <AutomationSection />
      </div>
    </div>
  );
}

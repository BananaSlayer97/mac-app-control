import StatisticsSection from "./settings/StatisticsSection";
import AppearanceSection from "./settings/AppearanceSection";
import GeneralSection from "./settings/GeneralSection";
import OrganizationSection from "./settings/OrganizationSection";
import AutomationSection from "./settings/AutomationSection";

export default function SettingsDashboard() {
  return (
    <div className="settings-dashboard">
      <h1 className="settings-title">Control Center</h1>

      <div className="settings-grid">
        <StatisticsSection />
        <AppearanceSection />
        <GeneralSection />
        <OrganizationSection />
        <AutomationSection />
      </div>
    </div>
  );
}

import ProfileHeader from "./ui/profile-header";
// import ProfileLevelProgression from "./ui/profile-level-progression";
// import ProfileAchievements from "./ui/profile-achievements";
import ProfileTabs from "./ui/profile-tabs";
import ProfileNavigateTest from "./ui/profile-navigate-test";

export default function Component() {
  return (
    <div className="min-h-screen bg-white ">
      <div className="max-w-[1180px] mx-auto  space-y-6 my-10">
        {/* Profile Header */}
        <ProfileHeader />

        {/* Progress Overview */}

        {/* Level Progression */}
        {/* <ProfileLevelProgression /> */}

        {/* Achievements */}
        {/* <ProfileAchievements /> */}

        {/* Tabs Section */}
        <ProfileTabs />

        {/* Call to Action Section - Similar to Home */}
      </div>
      <ProfileNavigateTest />
    </div>
  );
}

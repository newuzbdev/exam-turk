import ProfileHeader from "./ui/profile-header";
// import ProfileLevelProgression from "./ui/profile-level-progression";
// import ProfileAchievements from "./ui/profile-achievements";
import ProfileTabs from "./ui/profile-tabs";
import ProfileNavigateTest from "./ui/profile-navigate-test";

export default function Component() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Profile Header */}
        <ProfileHeader />

        {/* Exam History Section */}
        <ProfileTabs />
      </div>
    </div>
  );
}

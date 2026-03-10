import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import classroomService, {
  type AssignmentItem,
  type Classroom,
  type Institution,
} from "@/services/classroom.service";
import { useAuth } from "@/contexts/AuthContext";

type AccountType = "STUDENT" | "TEACHER" | "INSTITUTION";

interface ProfileManagementProps {
  accountType?: string;
}

const toIsoOrNull = (value: string): string | null => {
  if (!value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const getDefaultTab = (accountType: AccountType): "student" | "teacher" | "institution" => {
  if (accountType === "TEACHER") return "teacher";
  if (accountType === "INSTITUTION") return "institution";
  return "student";
};

const parseTabValue = (value: string): "student" | "teacher" | "institution" => {
  if (value === "teacher" || value === "institution") return value;
  return "student";
};

export default function ProfileManagement({ accountType }: ProfileManagementProps) {
  const { refreshUser } = useAuth();
  const normalizedAccountType: AccountType =
    accountType === "TEACHER" || accountType === "INSTITUTION" ? accountType : "STUDENT";

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [myAssignments, setMyAssignments] = useState<AssignmentItem[]>([]);
  const [activeTab, setActiveTab] = useState<"student" | "teacher" | "institution">(
    getDefaultTab(normalizedAccountType),
  );
  const [loading, setLoading] = useState(true);

  const [teacherDisplayName, setTeacherDisplayName] = useState("");
  const [teacherBio, setTeacherBio] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [classroomName, setClassroomName] = useState("");
  const [classroomDescription, setClassroomDescription] = useState("");
  const [classroomLevel, setClassroomLevel] = useState("");
  const [selectedInstitutionId, setSelectedInstitutionId] = useState("");
  const [inviteClassroomId, setInviteClassroomId] = useState("");
  const [inviteExpiresDays, setInviteExpiresDays] = useState("7");
  const [latestInviteCode, setLatestInviteCode] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const [assignmentClassroomId, setAssignmentClassroomId] = useState("");
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentNotes, setAssignmentNotes] = useState("");
  const [assignmentStartAt, setAssignmentStartAt] = useState("");
  const [assignmentEndAt, setAssignmentEndAt] = useState("");
  const [assignmentListeningTestId, setAssignmentListeningTestId] = useState("");
  const [assignmentReadingTestId, setAssignmentReadingTestId] = useState("");
  const [assignmentWritingTestId, setAssignmentWritingTestId] = useState("");
  const [assignmentSpeakingTestId, setAssignmentSpeakingTestId] = useState("");

  const institutionClassrooms = useMemo(() => {
    if (!selectedInstitutionId) return [];
    return classrooms.filter((item) => item.institutionId === selectedInstitutionId);
  }, [classrooms, selectedInstitutionId]);

  const reloadAll = useCallback(async () => {
    setLoading(true);
    const [profile, institutionList, classroomList, assignments] = await Promise.all([
      classroomService.getTeacherProfile(),
      classroomService.listInstitutions(),
      classroomService.listClassrooms(),
      classroomService.listMyAssignments(),
    ]);
    setInstitutions(institutionList);
    setClassrooms(classroomList);
    setMyAssignments(assignments);
    if (profile) {
      setTeacherDisplayName(profile.displayName || "");
      setTeacherBio(profile.bio || "");
    }
    if (institutionList[0]?.id) {
      setSelectedInstitutionId((prev) => prev || institutionList[0].id);
    }
    if (classroomList[0]?.id) {
      setInviteClassroomId((prev) => prev || classroomList[0].id);
      setAssignmentClassroomId((prev) => prev || classroomList[0].id);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  const saveTeacherProfile = async () => {
    const profile = await classroomService.upsertTeacherProfile({
      displayName: teacherDisplayName.trim(),
      bio: teacherBio.trim() || undefined,
    });
    if (profile && !teacherDisplayName.trim()) {
      setTeacherDisplayName(profile.displayName || "");
    }
  };

  const createInstitution = async () => {
    const created = await classroomService.createInstitution({ name: institutionName.trim() });
    if (created) {
      setInstitutionName("");
      await reloadAll();
    }
  };

  const createClassroom = async () => {
    const created = await classroomService.createClassroom({
      name: classroomName.trim(),
      description: classroomDescription.trim() || undefined,
      level: classroomLevel.trim() || undefined,
      institutionId: selectedInstitutionId || undefined,
    });
    if (created) {
      setClassroomName("");
      setClassroomDescription("");
      setClassroomLevel("");
      await reloadAll();
    }
  };

  const createInvite = async () => {
    if (!inviteClassroomId) return;
    const days = Number(inviteExpiresDays);
    const invite = await classroomService.createInvite(
      inviteClassroomId,
      Number.isFinite(days) && days > 0 ? days : undefined,
    );
    if (invite?.code) {
      setLatestInviteCode(invite.code);
    }
  };

  const joinClassroomByCode = async () => {
    if (!joinCode.trim()) return;
    const joined = await classroomService.joinByCode(joinCode);
    if (joined) {
      setJoinCode("");
      await reloadAll();
    }
  };

  const createAssignment = async () => {
    if (!assignmentClassroomId || !assignmentTitle.trim()) return;
    const startAt = toIsoOrNull(assignmentStartAt);
    const endAt = toIsoOrNull(assignmentEndAt);
    if (!startAt || !endAt) return;

    const created = await classroomService.createAssignment(assignmentClassroomId, {
      title: assignmentTitle.trim(),
      notes: assignmentNotes.trim() || undefined,
      startAt,
      endAt,
      listeningTestId: assignmentListeningTestId.trim() || undefined,
      readingTestId: assignmentReadingTestId.trim() || undefined,
      writingTestId: assignmentWritingTestId.trim() || undefined,
      speakingTestId: assignmentSpeakingTestId.trim() || undefined,
    });
    if (created) {
      setAssignmentTitle("");
      setAssignmentNotes("");
      setAssignmentListeningTestId("");
      setAssignmentReadingTestId("");
      setAssignmentWritingTestId("");
      setAssignmentSpeakingTestId("");
      await refreshUser();
      await reloadAll();
    }
  };

  return (
    <Card className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold text-gray-900">Profil Yönetimi</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(parseTabValue(value))}>
          <TabsList>
            <TabsTrigger value="student">Öğrenci</TabsTrigger>
            <TabsTrigger value="teacher">Öğretmen</TabsTrigger>
            <TabsTrigger value="institution">Kurum</TabsTrigger>
          </TabsList>

          <TabsContent value="student" className="pt-4">
            <div className="grid grid-cols-1 gap-4">
              <Card className="border border-gray-200">
                <CardContent className="pt-6 space-y-3">
                  <p className="text-sm text-gray-600">Davet kodu ile sınıfa katılabilirsiniz.</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Örn: AB12CD"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                    />
                    <Button onClick={joinClassroomByCode} className="bg-red-600 hover:bg-red-700 text-white">
                      Katıl
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">Atamalarım</h4>
                    <span className="text-xs text-gray-500">{myAssignments.length} kayıt</span>
                  </div>
                  {myAssignments.length === 0 ? (
                    <p className="text-sm text-gray-500">Henüz atanmış sınav yok.</p>
                  ) : (
                    <div className="space-y-2">
                      {myAssignments.map((item) => (
                        <div key={item.id} className="rounded-lg border border-gray-200 p-3">
                          <p className="font-medium text-gray-900">{item.assignment?.title || "Atama"}</p>
                          <p className="text-xs text-gray-600">
                            Durum: {item.status || "-"} | Zaman: {item.windowStatus || "-"}
                          </p>
                          <p className="text-xs text-gray-600">
                            Sınıf: {item.assignment?.classroom?.name || "-"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="teacher" className="pt-4">
            <div className="grid grid-cols-1 gap-4">
              <Card className="border border-gray-200">
                <CardContent className="pt-6 space-y-3">
                  <h4 className="font-semibold text-gray-900">Öğretmen Profili</h4>
                  <Input
                    placeholder="Görünecek ad"
                    value={teacherDisplayName}
                    onChange={(e) => setTeacherDisplayName(e.target.value)}
                  />
                  <Textarea
                    placeholder="Kısa biyografi"
                    value={teacherBio}
                    onChange={(e) => setTeacherBio(e.target.value)}
                  />
                  <Button onClick={saveTeacherProfile} className="bg-red-600 hover:bg-red-700 text-white">
                    Kaydet
                  </Button>
                </CardContent>
              </Card>

              <Card className="border border-gray-200">
                <CardContent className="pt-6 space-y-3">
                  <h4 className="font-semibold text-gray-900">Kurum Oluştur</h4>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Kurum adı"
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                    />
                    <Button onClick={createInstitution} className="bg-red-600 hover:bg-red-700 text-white">
                      Oluştur
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200">
                <CardContent className="pt-6 space-y-3">
                  <h4 className="font-semibold text-gray-900">Sınıf Oluştur</h4>
                  <Input
                    placeholder="Sınıf adı"
                    value={classroomName}
                    onChange={(e) => setClassroomName(e.target.value)}
                  />
                  <Input
                    placeholder="Seviye (örn: A1)"
                    value={classroomLevel}
                    onChange={(e) => setClassroomLevel(e.target.value)}
                  />
                  <Textarea
                    placeholder="Açıklama"
                    value={classroomDescription}
                    onChange={(e) => setClassroomDescription(e.target.value)}
                  />
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">Kurum (opsiyonel)</p>
                    <select
                      className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
                      value={selectedInstitutionId}
                      onChange={(e) => setSelectedInstitutionId(e.target.value)}
                    >
                      <option value="">Kurum seçmeden oluştur</option>
                      {institutions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button onClick={createClassroom} className="bg-red-600 hover:bg-red-700 text-white">
                    Sınıf Oluştur
                  </Button>
                </CardContent>
              </Card>

              <Card className="border border-gray-200">
                <CardContent className="pt-6 space-y-3">
                  <h4 className="font-semibold text-gray-900">Davet Kodu Oluştur</h4>
                  <select
                    className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
                    value={inviteClassroomId}
                    onChange={(e) => setInviteClassroomId(e.target.value)}
                  >
                    <option value="">Sınıf seçin</option>
                    {classrooms.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Geçerlilik günü"
                    value={inviteExpiresDays}
                    onChange={(e) => setInviteExpiresDays(e.target.value)}
                  />
                  <Button onClick={createInvite} className="bg-red-600 hover:bg-red-700 text-white">
                    Kod Üret
                  </Button>
                  {latestInviteCode ? (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                      Son kod: <span className="font-semibold">{latestInviteCode}</span>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="border border-gray-200">
                <CardContent className="pt-6 space-y-3">
                  <h4 className="font-semibold text-gray-900">Sınıf Ataması Oluştur</h4>
                  <select
                    className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
                    value={assignmentClassroomId}
                    onChange={(e) => setAssignmentClassroomId(e.target.value)}
                  >
                    <option value="">Sınıf seçin</option>
                    {classrooms.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    placeholder="Atama başlığı"
                    value={assignmentTitle}
                    onChange={(e) => setAssignmentTitle(e.target.value)}
                  />
                  <Textarea
                    placeholder="Not (opsiyonel)"
                    value={assignmentNotes}
                    onChange={(e) => setAssignmentNotes(e.target.value)}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      type="datetime-local"
                      value={assignmentStartAt}
                      onChange={(e) => setAssignmentStartAt(e.target.value)}
                    />
                    <Input
                      type="datetime-local"
                      value={assignmentEndAt}
                      onChange={(e) => setAssignmentEndAt(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      placeholder="Dinleme test ID"
                      value={assignmentListeningTestId}
                      onChange={(e) => setAssignmentListeningTestId(e.target.value)}
                    />
                    <Input
                      placeholder="Okuma test ID"
                      value={assignmentReadingTestId}
                      onChange={(e) => setAssignmentReadingTestId(e.target.value)}
                    />
                    <Input
                      placeholder="Yazma test ID"
                      value={assignmentWritingTestId}
                      onChange={(e) => setAssignmentWritingTestId(e.target.value)}
                    />
                    <Input
                      placeholder="Konuşma test ID"
                      value={assignmentSpeakingTestId}
                      onChange={(e) => setAssignmentSpeakingTestId(e.target.value)}
                    />
                  </div>
                  <Button onClick={createAssignment} className="bg-red-600 hover:bg-red-700 text-white">
                    Atamayı Kaydet
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="institution" className="pt-4">
            <div className="grid grid-cols-1 gap-4">
              <Card className="border border-gray-200">
                <CardContent className="pt-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Kurumlarım</h4>
                  {institutions.length === 0 ? (
                    <p className="text-sm text-gray-500">Henüz kurum kaydı yok. Öğretmen sekmesinden oluşturabilirsiniz.</p>
                  ) : (
                    <div className="space-y-2">
                      {institutions.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setSelectedInstitutionId(item.id)}
                          className={`w-full text-left rounded-lg border p-3 transition-colors ${
                            selectedInstitutionId === item.id
                              ? "border-red-300 bg-red-50"
                              : "border-gray-200 bg-white hover:bg-gray-50"
                          }`}
                        >
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-600">{item.id}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border border-gray-200">
                <CardContent className="pt-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Seçili Kurum Sınıfları</h4>
                  {selectedInstitutionId && institutionClassrooms.length > 0 ? (
                    <div className="space-y-2">
                      {institutionClassrooms.map((item) => (
                        <div key={item.id} className="rounded-lg border border-gray-200 p-3">
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-600">
                            Seviye: {item.level || "-"} | Üye: {item.members?.length || 0}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Seçili kurum için sınıf bulunamadı.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {loading ? <p className="mt-4 text-sm text-gray-500">Yükleniyor...</p> : null}
      </CardContent>
    </Card>
  );
}

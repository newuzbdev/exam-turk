import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import writingTestService, { type WritingTestItem } from "@/services/writingTest.service";
import writingSubmissionService from "@/services/writingSubmission.service";
import { toast } from "sonner";

interface WritingSubPart { id: string; label?: string; order?: number; question?: string; }
interface WritingSection { id: string; title?: string; description?: string; order?: number; subParts?: WritingSubPart[] }

export default function WritingTest() {
	const { testId } = useParams<{ testId: string }>();
	const navigate = useNavigate();

	const [loading, setLoading] = useState(true);
	const [test, setTest] = useState<WritingTestItem | null>(null);
	const [sections, setSections] = useState<WritingSection[]>([]);
	const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
	const [currentSubPartIndex, setCurrentSubPartIndex] = useState(0);
	const [answers, setAnswers] = useState<Record<string, string>>({});
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		const load = async () => {
			if (!testId) return;
			setLoading(true);
			const t = await writingTestService.getById(testId);
			setTest(t);
			// Normalize sections
			const s: WritingSection[] = (t as any)?.sections || [];
			setSections(Array.isArray(s) ? s : []);
			setLoading(false);
		};
		load();
	}, [testId]);

	const selectedSection = sections[currentSectionIndex];
	const subParts = selectedSection?.subParts || [];
	const hasSubParts = subParts.length > 0;
	const selectedSubPart = hasSubParts ? subParts[currentSubPartIndex] : undefined;
	const selectedQuestionId = useMemo(() => {
		if (selectedSubPart?.id) return selectedSubPart.id;
		// fallback to section id when no subparts
		return selectedSection?.id || "0";
	}, [selectedSection?.id, selectedSubPart?.id]);

	const handleAnswerChange = (value: string) => {
		setAnswers((prev) => ({ ...prev, [selectedQuestionId]: value }));
	};

	const handleSubmit = async () => {
		if (!testId) return;
		const currentAnswer = answers[selectedQuestionId] || "";
		if (!currentAnswer || currentAnswer.trim().length < 10) {
			toast.error("Lütfen en az 10 karakterlik bir cevap yazın");
			return;
		}
		setSubmitting(true);
		const payload = writingSubmissionService.formatSingleAnswerPayload(
			testId,
			selectedQuestionId,
			currentAnswer.trim(),
			test?.title
		);
		const res = await writingSubmissionService.create(payload);
		setSubmitting(false);
		if (res) {
			toast.success("Cevabınız kaydedildi");
			navigate("/test");
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-blue-50 p-6" />
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-blue-50 p-4 sm:p-6">
			<div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
				<div className="mb-6">
					<h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{test?.title || "Writing Test"}</h1>
					<p className="text-gray-600 mt-1">Talimatları dikkatle okuyun ve sağ taraftaki alana cevabınızı yazın.</p>
				</div>

				{/* Top-level section tabs */}
				{sections.length > 0 && (
					<Tabs value={String(currentSectionIndex)} onValueChange={(v) => {
						const idx = parseInt(v, 10) || 0;
						setCurrentSectionIndex(idx);
						setCurrentSubPartIndex(0);
					}}>
						<TabsList className="mb-4">
							{sections.map((s, idx) => (
								<TabsTrigger key={s.id} value={String(idx)} className="px-3 py-1.5 text-sm">
									{`Part ${idx + 1}`}
								</TabsTrigger>
							))}
						</TabsList>
					</Tabs>
				)}

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
					{/* Left: Questions */}
					<Card className="h-full">
						<CardHeader>
							<CardTitle className="text-lg">{selectedSection?.title || "Sorular"}</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-2 max-h-[60vh] overflow-auto pr-1">
								{/* Subpart tabs or single prompt */}
								{hasSubParts ? (
									<div className="space-y-2">
										<div className="flex gap-2 flex-wrap">
											{subParts.map((sp, idx) => (
												<button
													key={sp.id}
													className={`px-3 py-1.5 rounded-md text-sm transition ${idx === currentSubPartIndex ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
													onClick={() => setCurrentSubPartIndex(idx)}
												>
													{sp.label || `Soru ${idx + 1}`}
												</button>
											))}
										</div>
										<div className="p-3 rounded-md bg-gray-50 text-gray-800 leading-relaxed">
											{selectedSubPart?.question || selectedSection?.description}
										</div>
									</div>
								) : (
									<div className="space-y-2">
										{selectedSection?.description && (
											<div className="p-3 rounded-md bg-gray-50 text-gray-800 leading-relaxed">
												{selectedSection.description}
											</div>
										)}
										{test?.instruction && (
											<p className="text-xs text-gray-600">{test.instruction}</p>
										)}
									</div>
								)}
							</div>
						</CardContent>
					</Card>

					{/* Right: Answer */}
					<Card className="h-full">
						<CardHeader>
							<CardTitle className="text-lg">Cevap</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								<div className="relative">
									<textarea
										value={answers[selectedQuestionId] || ""}
										onChange={(e) => handleAnswerChange((e.target as HTMLTextAreaElement).value)}
										placeholder="Cevabınızı buraya yazın..."
										className="min-h-[420px] w-full rounded-lg border border-gray-300 bg-white p-4 text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									/>
									<div className="pointer-events-none absolute bottom-2 right-3 text-xs text-gray-500">
										{(answers[selectedQuestionId]?.trim().split(/\s+/).filter(Boolean).length) || 0} kelime
									</div>
								</div>
								<div className="flex items-center justify-between">
									<div className="text-xs text-gray-500">
										En az 10 karakter yazın. Önerilen: 150-250 kelime.
									</div>
									<div className="flex items-center gap-2">
										<Button variant="secondary" onClick={() => navigate(-1)}>Geri</Button>
										<Button onClick={handleSubmit} disabled={submitting}>
											{submitting ? "Gönderiliyor..." : "Cevabı Gönder"}
										</Button>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}



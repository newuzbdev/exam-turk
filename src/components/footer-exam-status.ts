type FooterExamDateRange = {
  examStart: string;
  examEnd: string;
};

export const footerExamHeading = (
  exam: FooterExamDateRange | undefined,
  today: string,
) =>
  exam && exam.examStart <= today && today <= exam.examEnd
    ? "Sınav devam ediyor"
    : "Yaklaşan sınav";

import { useParams, useNavigate } from "react-router-dom";
import ListeningTestDemo from "@/components/listening-test/ListeningTestDemo";
import { useEffect } from "react";
import "./components/index.css";

export default function ListeningTestPage() {
    const { testId } = useParams<{ testId: string }>();
    const navigate = useNavigate();
    // Re-enable exam mode to hide navbar/footer for listening
    useEffect(() => {
        if (typeof document !== "undefined") {
          document.body.classList.add("exam-mode");
        }
        return () => {
          if (typeof document !== "undefined") {
            document.body.classList.remove("exam-mode");
          }
        };
    }, []);
    if (!testId) {
        navigate("/test");
        return null;
    }

    return (
        <ListeningTestDemo
            testId={testId}
        />
    );
}
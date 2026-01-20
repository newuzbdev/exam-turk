import { useParams, useNavigate } from "react-router-dom";
import ListeningTestDemo from "@/components/listening-test/ListeningTestDemo";
import { useEffect } from "react";
import { overallTestFlowStore } from "@/services/overallTest.service";
import "./components/index.css";

export default function ListeningTestPage() {
    const { testId } = useParams<{ testId: string }>();
    const navigate = useNavigate();
    // Re-enable exam mode to hide navbar/footer for listening
     useEffect(() => {
         if (typeof document !== "undefined") {
           document.body.classList.add("exam-mode");
           // Double-check exam mode is active if in overall test flow
           if (overallTestFlowStore.hasActive()) {
             document.body.classList.add("exam-mode");
           }
         }
         // Do not remove exam mode on unmount if another test immediately mounts
         return () => {
           // leave as-is; final test pages will clean up
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
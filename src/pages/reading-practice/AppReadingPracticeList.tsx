import { Navigate, useLocation } from "react-router-dom";

export default function AppReadingPracticeList() {
  const location = useLocation();

  return (
    <Navigate
      to={`/app/pratik${location.search}${location.hash}`}
      replace
    />
  );
}

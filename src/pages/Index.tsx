
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the landing page
    navigate("/");
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <p className="text-xl text-muted-foreground">Redirecting to ModNote...</p>
      </div>
    </div>
  );
};

export default Index;

import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const BackButton = () => {

const navigate = useNavigate();

return (
<button
onClick={() => navigate(-1)}
className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition mb-6"
> <ArrowLeft size={18} />
Back </button>
);
};

export default BackButton;

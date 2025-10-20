import tatamyLogo from "@/assets/tatamy-logo.jpg";

export const TatamyLogo = () => {
  return (
    <div className="fixed top-4 right-4 z-10">
      <img 
        src={tatamyLogo} 
        alt="TATAMY" 
        className="h-12 w-auto opacity-70 hover:opacity-90 transition-all duration-200 drop-shadow-md"
      />
    </div>
  );
};

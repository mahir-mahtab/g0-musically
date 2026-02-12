import { context } from '@devvit/web/client';

type HomePageProps = {
  onCreateAlbum: () => void;
};

export const HomePage = ({ onCreateAlbum }: HomePageProps) => {
  const username = context.username ?? 'user';

  return (
    <div className="flex relative flex-col justify-center items-center min-h-screen gap-6 px-4">
      <img className="object-contain w-1/2 max-w-62.5 mx-auto" src="/snoo.png" alt="Snoo" />

      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-bold text-center text-gray-900">Hey {username} 👋</h1>
        <p className="text-base text-center text-gray-600">Ready to start a new collaborative album?</p>
      </div>

      <button
        className="flex items-center justify-center bg-[#d93900] text-white w-auto h-11 rounded-full cursor-pointer transition-colors px-6"
        onClick={onCreateAlbum}
        type="button"
      >
        Create Album
      </button>
    </div>
  );
};

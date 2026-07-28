"use client";

import { useEffect, useState } from "react";

const page = () => {
  const [status, setStatus] = useState("checking....");

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`)
      .then((r) => r.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("unreachable"));
  }, []);

  return (
    <main className="flex justify-center items-center min-h-screen p-24">
      <h1 className="text-4xl font-bold ">Qube</h1>

      <p className="mt-4 text-gray-500">API STATUS : {status}</p>
    </main>
  );
};

export default page;

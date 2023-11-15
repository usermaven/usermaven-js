import Head from 'next/head'
import { useUsermaven } from "@usermaven/nextjs";
import Link from "next/link";
import { useEffect } from "react";

export default function App() {
  const {id, track} = useUsermaven(); // import methods from useUsermaven hook

  useEffect(() => {
    id({
        id: '123456',
        email: 'test@email.com',
        created_at: "2021-01-20T09:55:35"
    }) // identify current user for all track events
    track('custom_event', {test: true}); // send custom event with payload
  }, [id, track])

  return (
    <div className="container">
      <Head>
        <title>Create Next App</title>
        <link rel="icon" href="/favicon.ico"/>
      </Head>

      /: Go to <Link href="/page">other page</Link>
    </div>
  )
}
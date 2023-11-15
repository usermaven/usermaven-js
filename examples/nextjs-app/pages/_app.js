import {createClient, UsermavenProvider, usePageView} from "@usermaven/nextjs";

// initialize Usermaven client
const usermavenClient = createClient({
    tracking_host: "https://events.usermaven.com",
    key: "UMXLIktQsI"
});

// wrap our app with Usermaven provider
function MyApp({Component, pageProps}) {
    usePageView(usermavenClient); // this hook will send pageview track event on router change

    return (
        <UsermavenProvider client={usermavenClient}>
            <Component {...pageProps} />
        </UsermavenProvider>
    )
}


export default MyApp
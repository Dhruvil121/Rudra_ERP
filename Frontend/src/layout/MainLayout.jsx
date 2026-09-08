import { Outlet } from "react-router-dom"
import { ReactLenis } from "lenis/react"

const MainLayout = () => {
    return (
        <div className="flex flex-col min-h-screen bg-[#f5f3f4] text-base-text font-sans antialiased">
            <ReactLenis root
                options={{
                    lerp: 0.1,
                    smooth: true,
                    direction: "vertical",
                    gestureDirection: "vertical",
                    smoothTouch: false,
                    touchMultiplier: 2,
                    infinite: false,
                }}
            >
                <main className="flex-grow w-full flex flex-col">
                    <Outlet />

                </main>
            </ReactLenis>

        </div>

    )
}

export default MainLayout
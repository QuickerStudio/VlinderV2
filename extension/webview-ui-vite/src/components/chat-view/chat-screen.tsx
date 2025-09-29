import React, { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Banner from "@/components/ui/Banner"
import StarryBackground from "@/components/ui/StarryBackground"
import MeteorShower from "@/components/ui/MeteorShower"
import { useExtensionState } from "@/context/extension-state-context"

const ChatScreen: React.FC = () => {
	const [greeting, setGreeting] = useState("")
	const [starryBackgroundActive, setStarryBackgroundActive] = useState(false)
	const { claudeMessages } = useExtensionState()

	// Check if on welcome screen (no messages)
	const isWelcomeScreen = claudeMessages.length === 0
	// Check if it's late night time
	const isLateNight = greeting === "Happy late night"

	// Get Banner glow color RGBA values
	const getBannerGlowColors = () => {
		if (isLateNight) {
			// Night pink #FF63CB
			return {
				'--glow-color-1': 'rgba(255, 99, 203, 0.32)',
				'--glow-color-2': 'rgba(255, 99, 203, 0.24)',
				'--glow-color-3': 'rgba(255, 99, 203, 0.16)',
				'--glow-color-4': 'rgba(255, 99, 203, 0.08)'
			}
		} else {
			// Daytime cyan #66FFDA
			return {
				'--glow-color-1': 'rgba(102, 255, 218, 0.32)',
				'--glow-color-2': 'rgba(102, 255, 218, 0.24)',
				'--glow-color-3': 'rgba(102, 255, 218, 0.16)',
				'--glow-color-4': 'rgba(102, 255, 218, 0.08)'
			}
		}
	}

	// Starry background state machine control functions
	const startStarryBackground = useCallback(() => {
		if (!starryBackgroundActive) {
			setStarryBackgroundActive(true)
		}
	}, [starryBackgroundActive])

	const stopStarryBackground = useCallback(() => {
		if (starryBackgroundActive) {
			setStarryBackgroundActive(false)
		}
	}, [starryBackgroundActive])

	// Greeting update
	useEffect(() => {
		const updateGreeting = () => {
			const hour = new Date().getHours()
			if (hour >= 5 && hour < 12) setGreeting("Good morning")
			else if (hour >= 12 && hour < 18) setGreeting("Good afternoon")
			else if (hour >= 18 && hour < 22) setGreeting("Good evening")
			else setGreeting("Happy late night")
		}

		updateGreeting()
		const interval = setInterval(updateGreeting, 60000)
		return () => clearInterval(interval)
	}, [])

	// State machine: send signals based on interface state and time
	useEffect(() => {
		if (isWelcomeScreen && isLateNight) {
			// Send signal to start starry animation
			startStarryBackground()
		} else {
			// Send signal to stop starry animation
			stopStarryBackground()
		}
	}, [isWelcomeScreen, isLateNight, startStarryBackground, stopStarryBackground])



	return (
		<div
			className="flex flex-col items-center justify-start pb-0 mb-0 p-2 sm:p-4 relative h-full overflow-hidden"
			style={{ backgroundColor: '#181818' }}
		>
			{/* Starry background component - responds to state machine signals */}
			{starryBackgroundActive && <StarryBackground active={starryBackgroundActive} />}

			{/* Meteor shower component - responds to state machine signals */}
			<MeteorShower active={starryBackgroundActive} />

			<Card className="w-full max-w-screen-lg border-0 border-unset bg-transparent flex-grow overflow-auto relative z-10">
				<CardHeader>
					<CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold text-center">
						<motion.div
							initial={{ opacity: 0, y: -20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5 }}
							className="bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text">
							{greeting}
						</motion.div>
					</CardTitle>
				</CardHeader>
				<CardContent className="p-2 sm:p-4">
					{/* Banner PNG via base64 (isolated in component) */}
					<div className="flex justify-center mb-4">
						<Banner
							className="max-w-full h-auto rounded-lg shadow banner-glow"
							style={{
								maxHeight: 200,
								...getBannerGlowColors()
							} as React.CSSProperties}
						/>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

export default ChatScreen

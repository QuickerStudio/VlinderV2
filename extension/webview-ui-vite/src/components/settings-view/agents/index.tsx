import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import _ from "lodash"
import { Badge } from "../../ui/badge"
import { ObserverAgentCard } from "./observer-agent-card"
import { ScholarAgentCard } from "./scholar-agent-card"

const AgentsTab: React.FC = () => {
	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="text-sm">Sub Task Agent</CardTitle>
						<Badge>Enabled</Badge>
					</div>
				</CardHeader>
				<CardContent>
					<CardDescription className="text-xs">
						Let's Vlinder spawn a sequentual agent with isolated context only for a specifc task passing back
						and the final information to Vlinder main thread
					</CardDescription>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="text-sm">Coder Agent</CardTitle>
						<Badge>Enabled</Badge>
					</div>
				</CardHeader>
				<CardContent>
					<CardDescription className="text-xs">
						Switches Vlinder to act as an architecture mode where it primary goal is to create a solution and
						gather knowledge while leaving the complex editing logic to a seperate agent with isolated
						context and tools to only perform code edits
					</CardDescription>
				</CardContent>
			</Card>

			<ObserverAgentCard />

			<ScholarAgentCard />
		</div>
	)
}

export default AgentsTab

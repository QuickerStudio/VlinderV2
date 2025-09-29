const readline = require("readline")

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
})

console.log("Interactive shell test starting...")

rl.question("What is your name? ", (name) => {
	console.log(`Hello, ${name}!`)

	rl.question("What is your favorite programming language? ", (language) => {
		console.log(`${language} is a great choice!`)

		rl.question("Do you want to exit? (yes/no) ", (answer) => {
			if (answer.toLowerCase() === "yes") {
				console.log("Exiting...")
				rl.close()
			} else {
				console.log("You chose to stay. Exiting anyway...")
				rl.close()
			}
		})
	})
})

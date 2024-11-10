import * as vscode from "vscode"
import { execSync } from "child_process"
import path from "path"
import { ClineAsk, ClineSay } from "../../shared/ExtensionMessage"

// Extend NotificationInfo to include notification type
export interface NotificationInfo {
	title?: string
	message?: string
	type?: "error" | "success" | "standard" // Added type for sound selection
}

export class NotificationService {
	private static instance: NotificationService

	private constructor() {}

	static getInstance(): NotificationService {
		if (!NotificationService.instance) {
			NotificationService.instance = new NotificationService()
		}
		return NotificationService.instance
	}

	async showNotification(
		title: string,
		message: string,
		type: "error" | "success" | "standard" = "standard"
	): Promise<void> {
		// Check if running on macOS
		if (process.platform !== "darwin") {
			return
		}

		try {
			// Select sound based on notification type
			let sound = "/System/Library/Sounds/Purr.aiff" // Default notification sound
			switch (type) {
				case "error":
					sound = "/System/Library/Sounds/Sosumi.aiff"
					break
				case "success":
					sound = "/System/Library/Sounds/Glass.aiff"
					break
			}

			// Play sound through current audio device
			execSync(`afplay "${sound}"`)

			// Show native macOS notification without sound
			execSync(`osascript -e 'display notification "${message}" with title "${title}"'`)
		} catch (error) {
			console.error("Error showing notification:", error)
		}
	}
}

export const notificationService = NotificationService.getInstance()

export function getNotificationForAskType(type: ClineAsk, text?: string): NotificationInfo | null {
	switch (type) {
		case "followup":
			return {
				title: "Question from Cline",
				message: text || "Cline has a follow-up question for you",
				type: "standard",
			}
		case "command":
			return {
				title: "Command Approval Required",
				message: text ? `Review and approve command:\n${text}` : "A command requires your approval",
				type: "standard",
			}
		// Skip notification for command output since it's too frequent
		case "command_output":
			return null

		case "completion_result":
			return {
				title: "Task Status Update",
				message: "Cline has completed a task - please review the results",
				type: "success",
			}
		case "tool":
			const toolMessage = text ? JSON.parse(text) : null
			if (toolMessage?.tool === "editedExistingFile") {
				return {
					title: "File Modification Review",
					message: `Review changes to: ${toolMessage.path || "file"}`,
					type: "standard",
				}
			} else if (toolMessage?.tool === "newFileCreated") {
				return {
					title: "New File Creation",
					message: `Review new file: ${toolMessage.path || "file"}`,
					type: "standard",
				}
			}
			return {
				title: "Workspace Action Required",
				message: "An action in your workspace requires approval",
				type: "standard",
			}
		case "api_req_failed":
			return {
				title: "API Error",
				message: text || "An API request has failed - review details and retry",
				type: "error",
			}
		case "mistake_limit_reached":
			return {
				title: "Action Required: Multiple Errors",
				message: "Cline needs your guidance to proceed after encountering several errors",
				type: "error",
			}
		case "browser_action_launch":
			return {
				title: "Browser Action Approval",
				message: text ? `Approve browser navigation to:\n${text}` : "A browser action requires your approval",
				type: "standard",
			}
		// Skip notifications for these common/less important cases
		case "resume_task":
		case "resume_completed_task":
			return null

		default:
			return null
	}
}

export function getNotificationForSayType(type: ClineSay, text?: string): NotificationInfo | null {
	switch (type) {
		case "error":
			return {
				title: "Cline Error",
				message: text || "An error occurred",
				type: "error",
			}
		case "completion_result":
			return {
				title: "Task Complete",
				message: "Task has been completed successfully",
				type: "success",
			}
		// Skip frequent/less important notifications
		case "user_feedback":
		case "user_feedback_diff":
		case "api_req_started":
		case "api_req_finished":
		case "api_req_retried":
		case "text":
		case "command_output":
		case "tool":
		case "browser_action":
		case "browser_action_result":
			return null

		case "shell_integration_warning":
			return {
				title: "Shell Warning",
				message: "Shell integration issue detected",
				type: "error",
			}
		default:
			return null
	}
}

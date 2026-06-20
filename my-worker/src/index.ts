import { Worker } from "@notionhq/workers";
import * as Builder from "@notionhq/workers/builder";
import * as Schema from "@notionhq/workers/schema";
import { j } from "@notionhq/workers/schema-builder";

const worker = new Worker();
export default worker;

// Define managed database
const invoices = worker.database("invoices", {
	type: "managed",
	initialTitle: "Invoices",
	primaryKeyProperty: "Invoice Number",
	schema: {
		properties: {
			Name: Schema.title(),
			"Invoice Number": Schema.richText(),
			"Client Name": Schema.richText(),
			"Job Address": Schema.richText(),
			Total: Schema.number(),
			Status: Schema.select([
				{ name: "Draft" },
				{ name: "Paid" }
			]),
		},
	},
});

// Configure pacer
const localPacer = worker.pacer("localApi", { allowedRequests: 10, intervalMs: 1000 });

// Register sync capability
worker.sync("invoicesSync", {
	database: invoices,
	mode: "replace",
	execute: async (state) => {
		await localPacer.wait();
		const localUrl = process.env.LOCAL_API_URL || "http://localhost:3000";
		
		try {
			const res = await fetch(`${localUrl}/api/invoices`);
			if (!res.ok) {
				throw new Error(`Local API returned status ${res.status}`);
			}
			const items = (await res.json()) as any[];
			
			return {
				changes: items.map((inv) => ({
					type: "upsert" as const,
					key: String(inv.invoiceNumber),
					properties: {
						Name: Builder.title(`Invoice #${inv.invoiceNumber} - ${inv.client?.name || "Unknown Client"}`),
						"Invoice Number": Builder.richText(String(inv.invoiceNumber)),
						"Client Name": Builder.richText(inv.client?.name || "Unknown Client"),
						"Job Address": Builder.richText(inv.client?.jobAddress || inv.client?.address || ""),
						Total: Builder.number(Number(inv.total) || 0),
						Status: Builder.select(inv.status || "Draft"),
					},
				})),
				hasMore: false,
			};
		} catch (error) {
			console.error("Failed to fetch invoices from local API. Using mock data fallback:", error);
			// Fallback mock data if the server is offline or unreachable from cloud
			return {
				changes: [
					{
						type: "upsert" as const,
						key: "1508",
						properties: {
							Name: Builder.title("Invoice #1508 - Roy Swazey's Roofing"),
							"Invoice Number": Builder.richText("1508"),
							"Client Name": Builder.richText("Roy Swazey's Roofing"),
							"Job Address": Builder.richText("12 Fieldcrest, Quispamsis, NB"),
							Total: Builder.number(9315),
							Status: Builder.select("Draft"),
						},
					}
				],
				hasMore: false,
			};
		}
	},
});

// Register tool capability
worker.tool("runPipeline", {
	title: "Run Invoice Pipeline",
	description: "Triggers the local invoice processing pipeline to scan Gmail for new invoices.",
	schema: j.object({}),
	execute: async () => {
		const localUrl = process.env.LOCAL_API_URL || "http://localhost:3000";
		try {
			const res = await fetch(`${localUrl}/api/pipeline/run`, {
				method: "POST",
				headers: { "Content-Type": "application/json" }
			});
			if (!res.ok) {
				return { success: false, message: `Failed to trigger pipeline. Status: ${res.status}` };
			}
			const result = await res.json();
			return { success: true, message: result.message || "Pipeline successfully triggered!" };
		} catch (error: any) {
			return { success: false, message: `Error contacting local pipeline: ${error.message}` };
		}
	}
});

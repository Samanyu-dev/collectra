import { KaggleDatasetConfig } from "../../../packages/core/adapters/KaggleAdapter";
import { HuggingFaceDatasetConfig } from "../../../packages/core/adapters/HuggingFaceAdapter";
import { GitHubDatasetConfig } from "../../../packages/core/adapters/GitHubDatasetAdapter";

/**
 * Pluggable dataset registry — the source-agnostic ingestion framework
 * (KaggleAdapter/HuggingFaceAdapter/GitHubDatasetAdapter + the
 * kaggle/huggingface/github-dataset-sync jobs) is generic and already works;
 * these arrays are what's actually run. Populated incrementally as real,
 * legally-usable datasets are found and vetted — see Phase 4 of the plan.
 * Never register a dataset here without confirming its license first.
 */

export const kaggleDatasets: KaggleDatasetConfig[] = [];

export const huggingfaceDatasets: HuggingFaceDatasetConfig[] = [];

export const githubDatasets: GitHubDatasetConfig[] = [];

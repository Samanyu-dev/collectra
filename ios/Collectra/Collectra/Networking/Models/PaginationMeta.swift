import Foundation

/// Mirrors `PaginationMeta` (src/lib/api/pagination.ts) — the metadata every
/// paginated `/api/v1` list route returns. Drives incremental catalog
/// loading; never assume a fixed page count client-side.
struct PaginationMeta: Decodable, Equatable {
    let page: Int
    let pageSize: Int
    let total: Int
    let totalPages: Int

    var isLastPage: Bool { page >= totalPages }
}

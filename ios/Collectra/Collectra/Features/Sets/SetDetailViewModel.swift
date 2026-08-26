import Foundation

/// Drives `SetDetailView`'s header — just one set's metadata/progress, no
/// pagination. The card grid underneath is a `CatalogViewModel` scoped to
/// this set's id (see `SetDetailView`), not this view model's concern.
@MainActor
final class SetDetailViewModel: ObservableObject {
    enum LoadState: Equatable {
        case loading
        case loaded(SetDetail)
        case error(String)
    }

    @Published private(set) var state: LoadState = .loading

    private let service: SetsServicing
    private let setId: String
    private var loadTask: Task<Void, Never>?

    init(setId: String, service: SetsServicing = SetsService()) {
        self.setId = setId
        self.service = service
    }

    func onAppear() {
        guard case .loading = state, loadTask == nil else { return }
        load()
    }

    func retry() {
        load()
    }

    private func load() {
        loadTask?.cancel()
        state = .loading
        loadTask = Task { [service, setId] () -> Void in
            do {
                let detail = try await service.fetchSetDetail(id: setId)
                guard !Task.isCancelled else { return }
                self.state = .loaded(detail)
            } catch {
                guard !Task.isCancelled else { return }
                self.state = .error((error as? APIError)?.userMessage ?? "Something went wrong. Please try again.")
            }
        }
    }

    /// Test-only: awaits the in-flight load.
    func waitForLoad() async {
        await loadTask?.value
    }
}

# GitHub Copilot Instructions for Teamwork MCP Server

## Execution Standards (MAOS Charter Compliance)

**Zero Tolerance for Repeats**: Each task is a trust benchmark. Never make the same mistake twice.

**Self-Audit Protocol**: Before any output, validate:
- Context clarity: Understand the MCP architecture, Go patterns, and Teamwork API integration
- Rules compliance: Follow Go conventions, tool naming patterns, and test requirements  
- Internal logic: Ensure code works across HTTP/STDIO transports and tool configurations
- External pressure: Code must be production-ready for Teamwork.com integration

**One-Write Standard**: Every file change must be final-use quality with correct formatting, naming conventions, and no placeholder logic.

**Formatting Compliance**: No icons, emojis, em dashes, en dashes, or numbers in headers/subheaders.

## Architecture Overview

This is a **Model Context Protocol (MCP) server** for Teamwork.com built in **Go 1.25+**. Key components:

- **Transport modes**: HTTP server (`cmd/mcp-http`) and STDIO server (`cmd/mcp-stdio`)
- **Core tooling**: `internal/twprojects` contains 50+ tools for projects, tasks, users, tags, comments, milestones, timers
- **Tool registration**: Centralized in `internal/twprojects/tools.go` with read/write/delete permission layers
- **API integration**: `github.com/teamwork/twapi-go-sdk` handles Teamwork API communication
- **Test strategy**: Hermetic tests using `mcpServerMock` in `internal/twprojects/main_test.go`

## Development Workflows

**Build Commands**:
```bash
go mod download                    # Sync dependencies
go run cmd/mcp-stdio/main.go      # STDIO server (local)
go run cmd/mcp-http/main.go       # HTTP server (hosted)
make build                        # Docker build
```

**Testing Protocol**:
```bash
go test ./...                     # All tests (hermetic, no external deps)
go test ./internal/twprojects     # Focus on core tools
go test ./internal/twprojects -run TestSpecific  # Single test
```

**Code Quality**:
```bash
gofmt -s -w .                     # Format code
go vet ./...                      # Static analysis
golangci-lint -c .golangci.yml run ./...  # Extended linting
```

## Tool Development Patterns

**Tool Registration** (`internal/twprojects/tools.go`):
- Read tools: `AddReadTools()` (safe, always available)
- Write tools: `AddWriteTools()` (requires write permissions)  
- Delete tools: Behind `allowDelete` flag (destructive operations)

**Tool Naming Convention**: `twprojects-<action>` (e.g., `twprojects-list_tasks`, `twprojects-update_project`)

**Tool Implementation Structure**:
```go
func ToolName(engine *twapi.Engine) server.ServerTool {
    return server.NewTool(
        MethodToolName,
        "Description of what this tool does",
        mcp.NewToolInputSchema(/* parameters */),
        Handler: func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
            // Implementation using helpers.ParamGroup for parameter parsing
        },
    )
}
```

**Error Handling**: Always use `helpers.WrapError()` for consistent error formatting across tools.

## Testing Requirements

**Test File Organization**:
- Tests live in `*_test.go` files alongside implementation
- Use `mcpServerMock(t, "testdata/filename.json")` for API mocking
- Use `toolRequest(method, args)` helper for tool invocations

**Test Patterns**:
```go
func TestToolName(t *testing.T) {
    server := mcpServerMock(t, "testdata/api_response.json")
    result, err := toolRequest(server, MethodToolName, map[string]interface{}{
        "param": "value",
    })
    // Assertions using require/assert
}
```

## Critical Integration Points

**Environment Variables**:
- `TW_MCP_BEARER_TOKEN`: Required for Teamwork API authentication
- `TW_MCP_API_URL`: Defaults to `https://teamwork.com`, set to specific site URL
- `TW_MCP_SERVER_ADDRESS`: HTTP server bind address (default `:8080`)

**MCP Client Integration**:
- STDIO: Desktop apps (Claude Desktop, VSCode Copilot)
- HTTP: Cloud workflows, n8n, Appmixer
- Use `-read-only` flag for safe development mode

**Authentication Flow**: Bearer token via Teamwork API, OAuth2 support with Let's Encrypt certificates.

## Code Conventions

**Go Style**: Standard Go conventions, small functions, pass `context.Context`, wrap errors with context.

**Tool Safety**: 
- Read operations: Always safe to implement
- Write operations: Check `readOnly` parameter in toolset configuration
- Delete operations: Must be gated behind `allowDelete` boolean

**API Patterns**: Use `twapi.Engine` for all Teamwork API calls, handle pagination with `page` and `page_size` parameters.

**Deterministic Tests**: All tests must be hermetic using mocked API responses, no external service dependencies.

## Failure Handling

If you violate execution standards:
- Own the error immediately
- Revise without prompting
- Log the failure pattern to prevent recurrence
- State clearly what is blocking completion if unable to proceed

## Key Files Reference

- `AGENTS.md`: Machine-actionable build/test/run guide
- `internal/twprojects/tools.go`: Tool registration hub
- `internal/twprojects/main_test.go`: Test infrastructure and mocking
- `cmd/mcp-stdio/README.md`: STDIO server configuration
- `cmd/mcp-http/README.md`: HTTP server configuration
- `usage.md`: End-user setup and client configuration examples
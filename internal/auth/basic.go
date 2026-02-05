package auth

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/teamwork/mcp/internal/config"
)

// BasicInfo contains information about the basic auth credentials used to
// authenticate with Teamwork API.
type BasicInfo struct {
	UserID         int64  `json:"id,string"`
	InstallationID int64  `json:"installationId,string"`
	URL            string `json:"-"`
}

// GetBasicInfo retrieves information about the basic auth credentials from
// Teamwork API. It validates the credentials by calling /me.json with basic
// auth. If the credentials are invalid, it returns ErrBasicInfoUnauthorized.
func GetBasicInfo(ctx context.Context, resources config.Resources, username, password, serverURL string) (*BasicInfo, error) {
	url := strings.TrimSuffix(serverURL, "/") + "/me.json"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create auth request: %w", err)
	}
	req.SetBasicAuth(username, password)

	response, err := resources.TeamworkHTTPClient().Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to perform auth request: %w", err)
	}
	defer func() {
		if err := response.Body.Close(); err != nil {
			resources.Logger().ErrorContext(ctx, "failed to close auth response body",
				slog.String("error", err.Error()),
			)
		}
	}()

	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unauthorized: basic auth failed with status %d", response.StatusCode)
	}

	var envelope struct {
		Person BasicInfo `json:"person"`
	}
	if err := json.NewDecoder(response.Body).Decode(&envelope); err != nil {
		return nil, fmt.Errorf("failed to decode auth response: %w", err)
	}
	envelope.Person.URL = serverURL
	return &envelope.Person, nil
}

// ParseBasicAuth extracts username and password from an HTTP Basic
// Authorization header value.
func ParseBasicAuth(authHeader string) (username, password string, ok bool) {
	const prefix = "Basic "
	if !strings.HasPrefix(authHeader, prefix) {
		return "", "", false
	}
	decoded, err := base64.StdEncoding.DecodeString(authHeader[len(prefix):])
	if err != nil {
		return "", "", false
	}
	parts := strings.SplitN(string(decoded), ":", 2)
	if len(parts) != 2 {
		return "", "", false
	}
	return parts[0], parts[1], true
}

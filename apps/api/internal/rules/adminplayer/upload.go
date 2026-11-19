package adminplayer

import (
	"encoding/base64"
	"encoding/binary"
	"regexp"
)

var uploadShape = regexp.MustCompile(`^data:image/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$`)

// ImageReadable is the byte checks of uploadAdminPlayerPicture (player-edit-picture.ts) that come before the upload: the
// data URL is a PNG or a JPEG in base64 that encodes back to itself, of 24 bytes to 1 MiB; a PNG is a 192 by 192 image
// (its signature, an IHDR chunk and the two sizes), a JPEG starts with its marker. The upload itself is not here.
func ImageReadable(dataURL string) bool {
	m := uploadShape.FindStringSubmatch(dataURL)
	if m == nil || len(m[2]) > 1398104 {
		return false
	}
	raw, err := base64.StdEncoding.DecodeString(m[2])
	if err != nil || len(raw) < 24 || len(raw) > 1048576 || base64.StdEncoding.EncodeToString(raw) != m[2] {
		return false
	}
	if m[1] == "png" {
		return string(raw[:8]) == "\x89PNG\r\n\x1a\n" && string(raw[12:16]) == "IHDR" &&
			binary.BigEndian.Uint32(raw[16:20]) == 192 && binary.BigEndian.Uint32(raw[20:24]) == 192
	}
	return raw[0] == 255 && raw[1] == 216 && raw[2] == 255
}

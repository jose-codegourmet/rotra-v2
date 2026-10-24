import type { AddressPinValue } from "@/components/ui/address-pin-field/AddressPinField";
import type { VenuePickerValue } from "@/components/ui/venue-picker/VenuePicker";

export const MOCK_ADDRESS_PIN_VALUE: AddressPinValue = {
	name: "SM Seaside Badminton Court",
	address: "SM Seaside City Cebu, SRP, Cebu City, 6000 Cebu",
	latitude: 10.2841,
	longitude: 123.8607,
};

export const MOCK_VENUE_PICKER_CONFIRMED: VenuePickerValue = {
	name: "SM Seaside Badminton Court",
	address: "SM Seaside City Cebu, SRP, Cebu City, 6000 Cebu",
	latitude: 10.2841,
	longitude: 123.8607,
	placeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
	isNewSubmission: false,
};

export const MOCK_VENUE_PICKER_NEW: VenuePickerValue = {
	name: "New Court Near Me",
	address: "Unnamed Road, Cebu City",
	latitude: 10.3157,
	longitude: 123.8854,
	isNewSubmission: true,
};

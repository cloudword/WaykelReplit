/// <reference types="vite/client" />
import { useEffect, useState, useRef } from 'react';

let isScriptLoading = false;
let isScriptLoaded = false;
let scriptLoadPromise: Promise<void> | null = null;

const loadGoogleMapsScript = (): Promise<void> => {
    if (isScriptLoaded && window.google) return Promise.resolve();
    if (scriptLoadPromise) return scriptLoadPromise;

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        console.warn("Google Maps API key is missing. Places Autocomplete will not work.");
        return Promise.reject("Missing API Key");
    }

    isScriptLoading = true;
    scriptLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
            isScriptLoaded = true;
            isScriptLoading = false;
            resolve();
        };
        script.onerror = (error) => {
            isScriptLoading = false;
            scriptLoadPromise = null;
            reject(error);
        };
        document.head.appendChild(script);
    });

    return scriptLoadPromise;
};

export function usePlacesAutocomplete(onPlaceSelect: (place: google.maps.places.PlaceResult) => void) {
    const [isLoaded, setIsLoaded] = useState(isScriptLoaded && !!window.google);
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

    useEffect(() => {
        let mounted = true;

        loadGoogleMapsScript()
            .then(() => {
                if (mounted) setIsLoaded(true);
            })
            .catch(console.error);

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (!isLoaded || !inputRef.current || !window.google) return;

        // Prevent double initialization
        if (autocompleteRef.current) return;

        autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
            componentRestrictions: { country: "in" },
            fields: ["address_components", "geometry", "icon", "name", "formatted_address"],
        });

        const listener = autocompleteRef.current.addListener("place_changed", () => {
            if (autocompleteRef.current) {
                const place = autocompleteRef.current.getPlace();
                if (place.geometry) {
                    onPlaceSelect(place);
                }
            }
        });

        // Cleanup to prevent memory leaks if component unmounts
        return () => {
            if (listener) {
                window.google.maps.event.removeListener(listener);
            }
            if (autocompleteRef.current) {
                window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
                autocompleteRef.current = null;
            }
        };
    }, [isLoaded, onPlaceSelect]);

    return { inputRef, isLoaded };
}

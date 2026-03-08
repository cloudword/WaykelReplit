/// <reference types="vite/client" />
import { useEffect, useState, useRef } from 'react';

let isScriptLoading = false;
let isScriptLoaded = false;
let loadMapPromise: Promise<void> | null = null;

export function usePlacesAutocomplete(onPlaceSelect: (place: google.maps.places.PlaceResult) => void) {
    const [isLoaded, setIsLoaded] = useState(isScriptLoaded);
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

    useEffect(() => {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

        if (!apiKey) {
            console.warn("Google Maps API key is missing. Places Autocomplete will not work.");
            return;
        }

        if (!isScriptLoading && !isScriptLoaded) {
            isScriptLoading = true;
            loadMapPromise = new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
                script.async = true;
                script.defer = true;
                script.onload = () => {
                    isScriptLoaded = true;
                    isScriptLoading = false;
                    setIsLoaded(true);
                    resolve();
                };
                script.onerror = (error) => {
                    isScriptLoading = false;
                    reject(error);
                };
                document.head.appendChild(script);
            });
        } else if (isScriptLoaded) {
            setIsLoaded(true);
        } else if (loadMapPromise) {
            loadMapPromise.then(() => setIsLoaded(true));
        }
    }, []);

    useEffect(() => {
        if (!isLoaded || !inputRef.current || !window.google) return;

        autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
            componentRestrictions: { country: "in" },
            fields: ["address_components", "geometry", "icon", "name", "formatted_address"],
        });

        autocompleteRef.current.addListener("place_changed", () => {
            if (autocompleteRef.current) {
                const place = autocompleteRef.current.getPlace();
                if (place.geometry) {
                    onPlaceSelect(place);
                }
            }
        });

        // Cleanup to prevent memory leaks if component unmounts
        return () => {
            if (autocompleteRef.current) {
                window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
            }
        };
    }, [isLoaded, onPlaceSelect]);

    return { inputRef, isLoaded };
}

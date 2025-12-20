/**
 * Type definitions for halson
 * HAL+JSON Resource Object library
 */

declare module 'halson' {
    interface HALSONResource {
        [key: string]: any;

        /**
         * List all link relations
         */
        listLinkRels(): string[];

        /**
         * List all embedded resource relations
         */
        listEmbedRels(): string[];

        /**
         * Get all links with the specified relation
         */
        getLinks(rel: string, filterCallback?: (link: any) => boolean, begin?: number, end?: number): any[];

        /**
         * Get first link with the specified relation
         */
        getLink(rel: string, filterCallback?: (link: any) => boolean, defaultValue?: any): any;

        /**
         * Get all embedded resources with the specified relation
         */
        getEmbeds(rel: string, filterCallback?: (embed: any) => boolean, begin?: number, end?: number): HALSONResource[];

        /**
         * Get first embedded resource with the specified relation
         */
        getEmbed(rel: string, filterCallback?: (embed: any) => boolean, defaultValue?: any): HALSONResource | null;

        /**
         * Add a link with the specified relation
         */
        addLink(rel: string, link: string | { href: string; title?: string; name?: string; type?: string; [key: string]: any }): HALSONResource;

        /**
         * Add an embedded resource with the specified relation
         */
        addEmbed(rel: string, embed: any | HALSONResource): HALSONResource;

        /**
         * Insert an embedded resource at a specific index
         */
        insertEmbed(rel: string, index: number, embed: any | HALSONResource): HALSONResource;

        /**
         * Remove links with the specified relation
         */
        removeLinks(rel: string, filterCallback?: (link: any) => boolean): HALSONResource;

        /**
         * Remove embedded resources with the specified relation
         */
        removeEmbeds(rel: string, filterCallback?: (embed: any) => boolean): HALSONResource;
    }

    /**
     * Create a new HAL+JSON Resource Object
     */
    function halson(data?: any): HALSONResource;

    export = halson;
}

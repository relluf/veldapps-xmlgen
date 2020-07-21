define(function() { 
	"use strict";
	return function(XSD_FILE, BRO_NAMESPACE) {
		var j$ = require("js/JsObject").$;
		var app = this.app(), ws = this.up("devtools/Workspace<>:root");
		var parser = ws.qsa("devtools/Editor<>:root")
			.map(_ => [_, _.vars(["resource.uri", true]) || ""])
			.filter(_ => _[1].endsWith(XSD_FILE))[0][0]
			.vars("parser");
		
		var sf = String.format;
		
		var parserMap = {};
		ws.qsa("devtools/Editor<xsd>:root").forEach(function(editor) {
			var parser = editor.vars("parser");
			var uri = editor.vars(["resource.uri"]);
			parserMap[uri] = parser;
		});	
	
		function js_getXs(path, elem) {
		    var r;
		    ["", "xs:", "xsd:"].some(function(prefix) {
		        var namePath = path.split(".").map(part => js.sf(part, prefix)).join(".");
		        r = r || js.get(namePath, elem);
		    });
		    return r;
		}
	
		var root_xmlns, all = {};
	
		var code = [], at__ = "@__", methods = {};
		code.indent = 0; code.push = function() {
			for(var i = 0; i < arguments.length; ++i) {
				Array.prototype.push.apply(
					this, [sf("%*c%s", this.indent, '\t', arguments[i])]);
			}
			return this.length;
		};
	
		function generate(elem, i) {
			var xmlns; 
	
			if(elem instanceof Array) { 
				xmlns = elem[0].split(":")[0]; 
				elem = elem[1]; 
			}
			
			if(!elem.hasOwnProperty("@__")) {
				return ws.print("hmpfrrr", elem);
			}
	
			xmlns = elem['@__'].parser.xmlns[''];
			root_xmlns = root_xmlns || xmlns;
			
	// if(all[sf("%s:%s", xmlns, elem['@_name'])] === true) {
	// 	return;
	// }
	// all[sf("%s:%s", xmlns, elem['@_name'])] = true;
			
			code.push(sf("'%s:%s': function(writer, instance) {", xmlns, elem['@_name']));
			code.indent++;
			
			var base, fixed;
			var features = elem[at__].features;
			for(var aname in features) {
				var feature = features[aname];
				var min = feature.xs['@_minOccurs'] || 1;
				var max = feature.xs['@_maxOccurs'] || 1;
				
	// console.log(min, max, typeof min, typeof max);
	
				// if(aname !== "gml:id" && aname.startsWith("gml:")) {
				// 	continue;
				// } else if(aname.indexOf(":") === -1) {
				if(feature.kind !== "attribute" && aname.indexOf(":") === -1) {
					if((feature.namespace || feature.namespace_) !== root_xmlns) {
						aname = String.format("%s:%s", feature.namespace || feature.namespace_, aname);
					}
				// } else if(aname.split(":")[0] === root_xmlns) {
				// 	aname = aname.split(":")[1];
				}
	
				if(feature.kind === "attribute") {
					code.push(sf("writer.attribute_(\"%s\", instance, \"%s\");", aname, feature.type));
				} else {//if(feature.kind === "element") {
					if(!types_used.hasOwnProperty(feature.type)) {
						types_used[feature.type] = true;
					}
					
					// %scomplexType.%ssimpleContent.%srestriction.@_base
				
					if(max === "unbounded") {
						code.push(sf("writer.elements_(\"%s\", instance, this['%s'], this, [%s, \"%s\"]);", aname, feature.type, min, max));
					} else if(parseInt(min) === 1 && parseInt(max) === 1) { // max is always 1 here?
						var type = parser.findType(feature.type);
						if(type) {
							if(feature.type.split(":").pop() === "string" || feature.type.indexOf(":") === -1) {
							// if(feature.type.indexOf(":") === -1 || feature.type.split(":")[0] === root_xmlns) {
								code.push(sf("writer.content_element_(\"%s\", instance, \"%s\");", aname, feature.type));
							} else {
								code.push(sf("writer.element_(\"%s\", instance, this['%s'], this, [%s, %s]);", aname, feature.type, min, max));
							}
						} else if((type = parser.findElement(feature.type))) {
							code.push(sf("writer.element_(\"%s\", instance, this['%s'], this, [%s, %s]);", aname, feature.type, min, max));
						} else if(feature.type !== undefined) {
							code.push(sf("writer.content_element_(\"%s\", instance, \"%s\");", aname, feature.type || "TODO"));
						} else if((base = js_getXs("%scomplexType.%ssimpleContent.%srestriction.@_base", feature.xs))) {
							code.push(sf("writer.element_(\"%s\", instance, function(writer, instance) {", aname));
							code.indent++;
							
							code.push(sf("/* INLINE complexType.simpleContent.restriction.@_base = '%s' */", base));
							if((fixed = js_getXs('%scomplexType.%ssimpleContent.%srestriction.%sattribute.@_fixed', feature.xs))) {
								code.push(sf("writer.attribute(\"%s\", \"%s\");", js_getXs('%scomplexType.%ssimpleContent.%srestriction.%sattribute.@_name', feature.xs), fixed));
							}
							code.push(sf("writer.content_(instance['#text'] || instance);", base));
	
							code.indent--;
							code.push(sf("}, this, [%s, %s]);", min, max));
						} else {
							code.push(sf("/** ???-1 %s */", aname));
						}
					} else {
						if((feature.type||"").includes(":")) {
						// if(js.get("type-resolved.%s.features", at__), feature) {
							code.push(sf("writer.element_(\"%s\", instance, this['%s'], this, [%s, %s]);", aname,  feature.type, min, max));
						} else if((base = js_getXs("%scomplexType.%ssimpleContent.%srestriction.@_base", feature.xs))) {
							code.push(sf("writer.element_(\"%s\", instance, function(writer, instance) {", aname));
							code.indent++;
							
							code.push(sf("/* INLINE complexType.simpleContent.restriction.@_base = '%s' */", base));
							if((fixed = js_getXs('%scomplexType.%ssimpleContent.%srestriction.%sattribute.@_fixed', feature.xs))) {
								code.push(sf("writer.attribute(\"%s\", \"%s\");", js_getXs('%scomplexType.%ssimpleContent.%srestriction.%sattribute.@_name', feature.xs), fixed));
							}
							code.push(sf("writer.content_(instance['#text'] || instance);", base));
	
							code.indent--;
							code.push(sf("}, this, [%s, %s]);", min, max));
						} else {
							code.push(sf("/** ???-2 %s */", aname));
						}
					}
				}
			}
			
			function getTypeResolved(elem, tr) {
				while((tr = js.get(at__ + ".type-resolved", elem))) {
					elem = tr;
				}
				return elem;
			}
			
			var resolvedType = getTypeResolved(elem);
			
			// if((base = js_getXs("%srestriction.@_base", elem)) === "string") {
			if((base = js_getXs("%ssimpleContent.%srestriction.@_base", resolvedType))) {
				code.push(sf("/* simpleContent.restriction.@_base = '%s' */", base));
				if((fixed = js_getXs('%ssimpleContent.%srestriction.%sattribute.@_fixed', resolvedType))) {
					code.push(sf("writer.attribute(\"%s\", \"%s\");", js_getXs('%ssimpleContent.%srestriction.%sattribute.@_name', resolvedType), fixed));
				}
				code.push(sf("writer.content_(instance['#text'] || instance);", base));
			} else if((base = js_getXs("%srestriction.@_base", elem)) === "string" || resolvedType.simpleContent || js.get(at__ + ".type-resolved.simpleContent", resolvedType)) {
				code.push(sf("/* simpleContent */"));
				code.push(sf("writer.content_(instance['#text'] || instance);"));
			} else if((base = js_getXs("%srestriction.@_base", elem))) {
				code.push(sf("/* restriction.@_base = '%s' */", base));
				code.push(sf("writer.content_(instance['#text'] || instance);", base));
			} else if(resolvedType) {
				// code.push(sf("/** ???-3  already handled? */", aname));
			}
	
			code.indent--;
			code.push("}");
			
			methods[js.sf("%s:%s", xmlns, elem['@_name'])] = code.join("\n");
			code.splice(0, code.length); code.indent = 0;
		}
		function generateTypesUsed() {
			Object.keys(types_used).sort().forEach(function(type) {
				if(types_used[type] && type.includes(":")) {
					var elem = parser.findElement(type);
					if(elem) {
						generate([type, elem]);
					} else if(parser.findType(type)) {
	// ws.print("types_used/type-generate/" + type, parser.findType(type));
						generate([type, parser.findType(type)]);
					} else {
						code.push("/** not found: " + type + "*/");
					}
				}
				types_used[type] = false;
			});
		}
	
		var types_used = {};
		parser.elems.forEach(generate);
		parser.imps.forEach(function(imp) {
			// hackery hack
			parserMap[imp[at__].uri].elems.forEach(_ => parser.stamp(_));
			parserMap[imp[at__].uri].elems.forEach(generate);
		});
	
		while(Object.keys(types_used)
				.filter(_ => types_used[_])
				.length > 0) {
				
			generateTypesUsed();
		}
	
		ws.qs("#editor-needed").execute({ 
			resource: { uri: sf("Writers-%s-%d.js", BRO_NAMESPACE, Date.now()) },
			selected: true
		}).on({
			"resource-loaded": function() {
				this.down(":root #ace").setValue(js.b(js.sf(
					"define(function(require) { return { %s }; });", 
					Object.keys(methods).sort().map(_ => methods[_]).join(",\n")
				)));
			}
		});
	};
});

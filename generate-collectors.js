define(function() {
	
	return function(XSD_FILE, BRO_NAMESPACE) {
		var sf = String.format;
		var j$ = require("js/JsObject").$;
		var app = this.app(), ws = this.up("devtools/Workspace<>:root");
		var parser = ws.qsa("devtools/Editor<>:root")
			.map(_ => [_, _.vars(["resource.uri", true]) || ""])
			.filter(_ => _[1].endsWith(XSD_FILE))[0][0]
			.vars("parser");
	
		function js_getXs(path, elem) {
		    var r;
		    ["", "xs:", "xsd:"].some(function(prefix) {
		        var namePath = path.split(".").map(part => 
		                js.sf(part, prefix)).join(".");
		
		        r = r || js.get(namePath, elem);
		    });
		    return r;
		}
		
		var root_xmlns;
		var parserMap = {};
		ws.qsa("devtools/Editor<xsd>:root").forEach(function(editor) {
			var parser = editor.vars("parser");
			var uri = editor.vars(["resource.uri"]);
			parserMap[uri] = parser;
		});	
		
		var code = [], at__ = "@__", methods = {};
		code.indent = 0; code.push = function() {
			for(var i = 0; i < arguments.length; ++i) {
				Array.prototype.push.apply(
					this, [sf("%*c%s", this.indent, '\t', arguments[i])]);
			}
			return this.length;
		};
	
		function generate(elem, i) {
			if(elem instanceof Array) { 
				xmlns = elem[0].split(":")[0]; 
				elem = elem[1]; 
			}
			
			if(!elem.hasOwnProperty("@__")) {
				return ws.print("hmpfrrr", elem);
			}
			
			xmlns = elem['@__'].parser.xmlns[''];
			root_xmlns = root_xmlns || xmlns;
			var features = elem[at__].features;
			if(!features || Object.keys(features).length === 0) {
				// return;
				features = {};
			}
	
			var fname = elem['@_name']; 
			
			code.push(sf("\'%s:%s\': function(instance, context) {", xmlns, elem['@_name']));
			code.indent++;
			code.push(sf("return Make.feature(instance, {"));
			code.indent++;
	
			function sort_attrs(k1, k2) {
				var a1 = features[k1], a2 = features[k2];
				a1 = String.format("%s:%s", a1.namespace, k1);
				a2 = String.format("%s:%s", a2.namespace, k2);
				return a1 < a2 ? -1 : 1;
			}
	
			Object.keys(features)/*.sort(sort_attrs)*/.forEach(function(aname) {
				var feature = features[aname];
	
				if(feature.kind !== "attribute" && aname.indexOf(":") === -1) {
					if((feature.namespace || feature.namespace_) !== root_xmlns) {
						aname = String.format("%s:%s", feature.namespace || feature.namespace_, aname);
					}
				}
				
				if(feature.kind === "element" && !types_used.hasOwnProperty(feature.type)) {
					types_used[feature.type] = true;
				}
	
				var documentation = js_getXs("xs.%sannotation.%sdocumentation.#text", feature) || js_getXs("xs.%sannotation.%sdocumentation", feature) || "no annotation";
				code.push(String.format("\"%s\": function(instance) {", aname));
				code.indent++;
				
				var instance_name = String.format("instance%s", 
					aname.indexOf(":") === -1 ? "." + aname : String.format("['%s']", aname)
				);
				
	/** Feature **/
	
				var min = feature.xs['@_minOccurs'];
				var max = feature.xs['@_maxOccurs'];
				var ret, index, comment;
				
				if(min === undefined) min = 1;
				if(max === undefined) max = 1;
	
				if(feature.type === "gml:id") {
					ret = "Make.gml_id(instance.id)";
				} else if(feature.type === "date") {
					ret = String.format("Make.date(%s)", instance_name);
				} else if(feature.type === "dateTime") {
					ret = String.format("Make.datetime(%s)", instance_name);
				} else if(feature.type === "string" || feature.type === "xs:string") {
					ret = String.format("Make.string(%s)", instance_name);
				} else if(feature.type === undefined) {
					if((base = js_getXs("%scomplexType.%ssimpleContent.%srestriction.@_base", feature.xs))) {
						ret = sf("Make.text(%s)", instance_name);
					}
				} else {
					// ret = String.format("Make.feature(instance, \"%s[%s, %s]\", this, context); // [%s]", feature.type, 
					ret = String.format("Make.feature(%s, \"%s[%s, %s]\", this, context)", 
						instance_name, feature.type, min, max
					);
				}
				
				comment = sf("%s[%s, %s] - %s", feature.type || sf("complexType.simpleContent.restriction.@_base = '%s'", base), 
					min, max, documentation);
	
				code.push(String.format("/*- %s */", comment));
				code.push(String.format("return %s;", ret));
						
				code.indent--;
				code.push("},");
			}); // end forEach(aname)
			
			if(js_getXs("%ssimpleContent.%srestriction.@_base", elem)) {
				code.push(String.format("'#text': function(instance) {"));
				code.indent++;
				code.push(String.format("return instance['#text'] || instance;"));
				code.indent--;
				code.push("}");
			} else if(js_getXs("%ssimpleContent", elem)) {
				code.push(String.format("'#text': function(instance) {"));
				code.indent++;
				code.push(String.format("return instance['#text'] || instance; /* simpleContent.restriction.@_base = '%s' */", 
					js_getXs("%ssimpleContent.%srestriction.@_base", elem)));
				code.indent--;
				code.push("}");
			} else if(js_getXs("%srestriction.@_base", elem) === "string" || elem.simpleContent || 
					js.get(at__ + ".type-resolved.simpleContent", elem)) {
				code.push(String.format("'#text': function(instance) {"));
				code.indent++;
				code.push(String.format("return instance['#text'] || instance; /* simpleContent.restriction.@_base = 'string' */"));
				code.indent--;
				code.push("}");
				// code.push(sf("writer.content_(instance); /* simpleContent.restriction.@_base = 'string' */"));
			} else if(js_getXs("%srestriction.@_base", elem)) {
				code.push(String.format("'#text': function(instance) {"));
				code.indent++;
				code.push(String.format("return instance['#text'] || instance; /* restriction.@_base = '%s' */", 
					js_getXs("%srestriction.@_base", elem)));
				code.indent--;
				code.push("}");
			}
	
			code.indent--;
			code.push(sf("}, this, context);"));
			code.indent--;
			code.push(sf("}"));
	
			methods[js.sf("%s:%s", xmlns, elem['@_name'])] = code.join("\n");
			code.splice(0, code.length); code.indent = 0;
		}
		function sort_elems(e1, e2) {
			return e1['@_name'] < e2['@_name'] ? -1 : 1;
		}
		function sort_types(t1, t2) {
			return t1['@_name'] < t2['@_name'] ? -1 : 1;
		}
		function generateTypesUsed() {
			Object.keys(types_used).sort().forEach(function(type) {
				if(types_used[type] && type.includes(":")) {
					var elem = parser.findElement(type);
					if(elem) {
						generate([type, elem]);
					} else if(parser.findType(type)) {
						generate([type, parser.findType(type)]);
					} else {
						code.push("/** not found: " + type + "*/");
					}
				}
				types_used[type] = false;
			});
		}
		
		var types_used = {};
		parser.elems.sort(sort_elems).forEach(generate);
		parser.imps.forEach(function(imp) {
			parserMap[imp[at__].uri].elems.forEach(generate);
		});
	
		while(Object.keys(types_used)
				.filter(_ => types_used[_])
				.length > 0) {
	
			generateTypesUsed();
		}
	
		ws.qs("#editor-needed").execute({ 
			resource: { uri: sf("Collectors-%s-%d.js", BRO_NAMESPACE, Date.now()) },
			selected: true
		}).on({
			"resource-loaded": function() {
				this.down(":root #ace").setValue(js.b(js.sf("({%s})", Object.keys(methods).sort().map(_ => methods[_]).join(",\n"))));
			}
		});
	};
	
});